import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { toJpeg, toPng } from 'html-to-image';

const imageCache = new Map();

const loadImageAsDataUrl = async (src) => {
  const key = String(src || '');
  if (!key) return null;
  if (imageCache.has(key)) return imageCache.get(key);

  const p = (async () => {
    const res = await fetch(key);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  })();

  imageCache.set(key, p);
  return p;
};

const getImageSize = (dataUrl) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ w: img.naturalWidth || img.width || 0, h: img.naturalHeight || img.height || 0 });
  img.onerror = () => resolve({ w: 0, h: 0 });
  img.src = dataUrl;
});

const toText = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

const containsArabic = (text) => {
  const s = String(text || '');
  // Arabic + related blocks
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s);
};

const tableHasArabic = (headers = [], rows = []) => {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  for (const h of safeHeaders) {
    if (containsArabic(toText(h))) return true;
  }
  for (const r of safeRows) {
    const cells = Array.isArray(r) ? r : [];
    for (const c of cells) {
      if (containsArabic(toText(c))) return true;
    }
  }
  return false;
};

const getCssVar = (name, fallback = '') => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    const s = String(v || '').trim();
    return s || fallback;
  } catch {
    return fallback;
  }
};

const parseCssColorToRgb = (raw, fallback = { r: 31, g: 41, b: 55 }) => {
  const s = String(raw || '').trim();
  if (!s) return fallback;

  const hex = s.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (hex) {
    const h = hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgb = s.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)$/i);
  if (rgb) {
    return { r: Number(rgb[1]) || 0, g: Number(rgb[2]) || 0, b: Number(rgb[3]) || 0 };
  }

  return fallback;
};

const rgbToExcelArgb = ({ r, g, b }) => {
  const toHex2 = (n) => {
    const v = Math.max(0, Math.min(255, Number(n) || 0));
    return v.toString(16).padStart(2, '0').toUpperCase();
  };
  return `FF${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
};

const buildTableImageDataUrl = async ({ headers = [], rows = [], theme, rtl = false }) => {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${Number(theme?.containerPx) || 1120}px`;
  container.style.background = '#FFFFFF';
  container.style.padding = '12px';
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Arial, sans-serif';
  if (rtl) container.style.direction = 'rtl';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';
  table.style.color = '#111827';
  if (rtl) table.style.direction = 'rtl';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  for (const h of safeHeaders) {
    const th = document.createElement('th');
    th.textContent = toText(h);
    th.style.background = theme?.headerBg || '#1F2937';
    th.style.color = '#FFFFFF';
    th.style.textAlign = rtl ? 'right' : 'left';
    th.style.fontWeight = '700';
    th.style.padding = '8px 10px';
    th.style.border = `1px solid ${theme?.gridBorder || '#E5E7EB'}`;
    th.style.whiteSpace = 'normal';
    th.style.wordBreak = 'break-word';
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const r of safeRows) {
    const tr = document.createElement('tr');
    const cells = Array.isArray(r) ? r : [];
    for (let i = 0; i < safeHeaders.length; i += 1) {
      const td = document.createElement('td');
      td.textContent = toText(cells[i]);
      td.style.padding = '7px 10px';
      td.style.border = `1px solid ${theme?.gridBorder || '#E5E7EB'}`;
      td.style.verticalAlign = 'top';
      td.style.whiteSpace = 'normal';
      td.style.wordBreak = 'break-word';
      if (rtl) td.style.textAlign = 'right';
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  container.appendChild(table);
  document.body.appendChild(container);
  try {
    const pixelRatio = Math.max(1, Number(theme?.pixelRatio) || 1.6);

    // Prefer PNG for jsPDF reliability.
    try {
      const pngUrl = await toPng(container, { pixelRatio, cacheBust: true, backgroundColor: '#FFFFFF' });
      const { w: pw, h: ph } = await getImageSize(pngUrl);
      if (!pw || !ph) throw new Error('PNG image render failed');
      // Avoid extremely large data URLs that some browsers/jsPDF builds struggle with.
      if (String(pngUrl).length <= 2_500_000) {
        return { dataUrl: pngUrl, format: 'PNG', w: pw, h: ph };
      }
      // Too large: fall through to JPEG.
    } catch {
      // Fall through to JPEG.
    }

    const quality = Math.min(1, Math.max(0.5, Number(theme?.jpegQuality) || 0.84));
    const jpgUrl = await toJpeg(container, { pixelRatio: Math.max(1, pixelRatio - 0.4), quality, cacheBust: true, backgroundColor: '#FFFFFF' });
    const { w, h } = await getImageSize(jpgUrl);
    if (!w || !h) throw new Error('JPEG image render failed');
    return { dataUrl: jpgUrl, format: 'JPEG', w, h };
  } finally {
    document.body.removeChild(container);
  }
};

const buildTableImagePages = async ({ headers = [], rows = [], theme, rtl = false }) => {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const maxRowsPerImage = Math.max(10, Number(theme?.maxRowsPerImage) || 35);
  if (safeRows.length <= maxRowsPerImage) {
    return [await buildTableImageDataUrl({ headers: safeHeaders, rows: safeRows, theme, rtl })];
  }

  const urls = [];
  for (let i = 0; i < safeRows.length; i += maxRowsPerImage) {
    const chunk = safeRows.slice(i, i + maxRowsPerImage);
    // Keep the header on every page chunk.
    // eslint-disable-next-line no-await-in-loop
    const u = await buildTableImageDataUrl({ headers: safeHeaders, rows: chunk, theme, rtl });
    urls.push(u);
  }
  return urls;
};

const addTallImageToPdf = async ({ doc, dataUrl, format = 'PNG', imgWpx: _imgWpxIn = 0, imgHpx: _imgHpxIn = 0, x, y, maxW, maxHFirst, marginTop = 40 }) => {
  // Always load the image element because slicing via canvas requires a drawable source.
  const img = new Image();
  const ok = await new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
  if (!ok) throw new Error('Failed to load rendered table image');

  const imgWpx = img.naturalWidth || img.width || 0;
  const imgHpx = img.naturalHeight || img.height || 0;
  // Treat 0x0 as failure so we don't produce blank PDFs.
  if (!imgWpx || !imgHpx) throw new Error('Rendered table image has invalid dimensions');

  const pageH = doc.internal.pageSize.getHeight();
  const maxHOthers = pageH - (marginTop + 40);
  const maxH = Math.max(1, Math.min(Number(maxHFirst) || maxHOthers, maxHOthers));

  const scale = maxW / imgWpx;
  const scaledH = imgHpx * scale;

  if (scaledH <= maxHFirst) {
    doc.addImage(dataUrl, format, x, y, maxW, scaledH);
    return { finalY: y + scaledH };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { finalY: y };

  const sliceHpx = Math.max(1, Math.floor(maxH / scale));
  canvas.width = imgWpx;
  canvas.height = sliceHpx;

  let offsetYpx = 0;
  let cursorY = y;
  let first = true;

  while (offsetYpx < imgHpx) {
    const remaining = imgHpx - offsetYpx;
    const currentSliceH = Math.min(sliceHpx, remaining);
    canvas.height = currentSliceH;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, offsetYpx, imgWpx, currentSliceH, 0, 0, imgWpx, currentSliceH);
    const sliceUrl = canvas.toDataURL('image/png');

    const availableHpt = first ? (Number(maxHFirst) || maxH) : maxH;
    const drawHpt = Math.min(availableHpt, currentSliceH * scale);
    doc.addImage(sliceUrl, 'PNG', x, cursorY, maxW, drawHpt);

    offsetYpx += currentSliceH;
    first = false;
    if (offsetYpx < imgHpx) {
      doc.addPage();
      cursorY = marginTop;
    }
  }

  return { finalY: cursorY + 10 };
};

const csvEscape = (s) => {
  const text = toText(s);
  if (/[\n\r,"]/g.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export function exportTableToCSV({
  filename = 'export.csv',
  title = '',
  subtitle = '',
  includeMetaRows = false,
  headers = [],
  rows = [],
  tables = null,
}) {
  const lines = [];

  const writeSingleTable = ({ title: tTitle = '', subtitle: tSubtitle = '', headers: tHeaders = [], rows: tRows = [], includeMeta = false }) => {
    const safeHeaders = Array.isArray(tHeaders) ? tHeaders : [];
    const safeRows = Array.isArray(tRows) ? tRows : [];
    const colCount = Math.max(1, safeHeaders.length);
    const padRow = (cells) => {
      const arr = Array.isArray(cells) ? cells : [];
      const padded = arr.slice(0, colCount);
      while (padded.length < colCount) padded.push('');
      return padded;
    };

    if (includeMeta) {
      if (tTitle) lines.push(padRow([tTitle]).map(csvEscape).join(','));
      if (tSubtitle) lines.push(padRow([tSubtitle]).map(csvEscape).join(','));
      if (tTitle || tSubtitle) lines.push(padRow(['']).map(csvEscape).join(','));
    }

    lines.push(padRow(safeHeaders).map(csvEscape).join(','));
    for (const r of safeRows) {
      lines.push(padRow(r).map(csvEscape).join(','));
    }
  };

  if (Array.isArray(tables) && tables.length > 0) {
    for (let i = 0; i < tables.length; i += 1) {
      const t = tables[i] || {};
      writeSingleTable({
        title: t.title || '',
        subtitle: t.subtitle || '',
        headers: t.headers || [],
        rows: t.rows || [],
        includeMeta: true,
      });
      if (i !== tables.length - 1) lines.push('');
    }
  } else {
    writeSingleTable({ title, subtitle, headers, rows, includeMeta: includeMetaRows });
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportTableToExcel({
  filename = 'export.xlsx',
  sheetName = 'Sheet1',
  title = '',
  subtitle = '',
  showTitle = false,
  headerImageSrc = '',
  headers = [],
  rows = [],
  sheets = null,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nuuru Al-Bayaan';
  wb.created = new Date();

  const excelTheme = (() => {
    const brand = getCssVar('--nb-color-brand', '#4B2C20');
    const border = getCssVar('--nb-color-border', '#E5E7EB');
    const headerRgb = parseCssColorToRgb(brand, { r: 75, g: 44, b: 32 });
    const borderRgb = parseCssColorToRgb(border, { r: 229, g: 231, b: 235 });
    return {
      headerArgb: rgbToExcelArgb(headerRgb),
      borderArgb: rgbToExcelArgb(borderRgb),
    };
  })();

  const writeWorksheet = async ({ ws, sheetTitle, sheetSubtitle, sheetHeaders, sheetRows, includeBranding }) => {
    const safeHeaders = Array.isArray(sheetHeaders) ? sheetHeaders : [];
    const safeRows = Array.isArray(sheetRows) ? sheetRows : [];
    const colCount = Math.max(1, safeHeaders.length);

    ws.properties.defaultRowHeight = 18;

    const mergeAcross = (rowIndex) => {
      if (colCount > 1) ws.mergeCells(rowIndex, 1, rowIndex, colCount);
    };

    let rowCursor = 1;

    // 1) Add header image (branding) if provided
    if (includeBranding && headerImageSrc) {
      const dataUrl = await loadImageAsDataUrl(headerImageSrc);
      if (dataUrl) {
        const base64 = String(dataUrl).split(',')[1] || '';
        if (base64) {
          const imageId = wb.addImage({ base64, extension: 'png' });
          for (let r = 1; r <= 6; r += 1) ws.getRow(r).height = 18;

          const imgW = 720;
          const imgH = 100;
          const startCol = Math.max(0, (colCount / 2) - 3.5);
          ws.addImage(imageId, {
            tl: { col: startCol, row: 0 },
            ext: { width: imgW, height: imgH },
          });
          rowCursor = 7;
        }
      }
    }

    // 2) Title + subtitle
    if (showTitle && sheetTitle) {
      mergeAcross(rowCursor);
      const c = ws.getCell(rowCursor, 1);
      c.value = toText(sheetTitle);
      c.font = { bold: true, size: 16 };
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      ws.getRow(rowCursor).height = 24;
      rowCursor += 1;
    }
    if (sheetSubtitle) {
      mergeAcross(rowCursor);
      const c = ws.getCell(rowCursor, 1);
      c.value = toText(sheetSubtitle);
      c.font = { size: 10, color: { argb: 'FF374151' } };
      c.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      ws.getRow(rowCursor).height = 34;
      rowCursor += 1;
    }
    if ((showTitle && sheetTitle) || sheetSubtitle) rowCursor += 1;

    // 3) Header row
    const headerRowIndex = rowCursor;
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.values = [null, ...safeHeaders.map(toText)];
    for (let c = 1; c <= colCount; c += 1) {
      const cell = headerRow.getCell(c);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelTheme.headerArgb } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
    headerRow.height = 26;
    rowCursor += 1;

    // 4) Data rows
    for (const rawRow of safeRows) {
      const row = ws.getRow(rowCursor);
      const values = (Array.isArray(rawRow) ? rawRow : []).map(toText);
      row.values = [null, ...values];
      rowCursor += 1;
    }

    // Borders + widths
    const sampleN = Math.min(50, safeRows.length);
    const widths = Array.from({ length: colCount }).map((_, cIdx) => {
      let maxLen = safeHeaders[cIdx] ? String(safeHeaders[cIdx]).length : 0;
      for (let i = 0; i < sampleN; i += 1) {
        const v = Array.isArray(safeRows[i]) ? safeRows[i][cIdx] : '';
        maxLen = Math.max(maxLen, String(toText(v)).length);
      }
      const header = String(safeHeaders[cIdx] || '').toLowerCase();
      const minW = header.includes('rank') ? 8 : header.includes('student') ? 22 : 12;
      const maxW = header.includes('student') ? 55 : 40;
      return Math.min(maxW, Math.max(minW, Math.ceil(maxLen * 1.25) + 2));
    });

    ws.columns = widths.map((w) => ({ width: w }));

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < headerRowIndex) return;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: excelTheme.borderArgb } },
          left: { style: 'thin', color: { argb: excelTheme.borderArgb } },
          bottom: { style: 'thin', color: { argb: excelTheme.borderArgb } },
          right: { style: 'thin', color: { argb: excelTheme.borderArgb } },
        };
        if (rowNumber !== headerRowIndex) {
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: false };
        }
      });
    });

    ws.views = [{ state: 'normal' }];
  };

  const normalizeSheetName = (n) => String(n || 'Sheet')
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31) || 'Sheet';

  const makeUniqueSheetName = (rawName, used) => {
    const usedSet = used instanceof Set ? used : new Set();
    const base = normalizeSheetName(rawName);
    if (!usedSet.has(base)) {
      usedSet.add(base);
      return base;
    }

    // Excel worksheet name limit is 31 chars.
    // Add a numeric suffix while preserving as much of the base as possible.
    for (let i = 2; i < 10_000; i += 1) {
      const suffix = ` (${i})`;
      const maxBaseLen = Math.max(1, 31 - suffix.length);
      const candidate = `${base.slice(0, maxBaseLen)}${suffix}`;
      if (!usedSet.has(candidate)) {
        usedSet.add(candidate);
        return candidate;
      }
    }

    // Extremely unlikely fallback
    const fallback = `${base.slice(0, 25)}-${Date.now().toString().slice(-5)}`.slice(0, 31);
    usedSet.add(fallback);
    return fallback;
  };

  if (Array.isArray(sheets) && sheets.length > 0) {
    const usedSheetNames = new Set();
    for (let i = 0; i < sheets.length; i += 1) {
      const s = sheets[i] || {};
      const name = makeUniqueSheetName(s.sheetName || s.name || `Sheet${i + 1}`, usedSheetNames);
      const ws = wb.addWorksheet(name);
      await writeWorksheet({
        ws,
        sheetTitle: s.title || '',
        sheetSubtitle: s.subtitle || '',
        sheetHeaders: s.headers || [],
        sheetRows: s.rows || [],
        includeBranding: i === 0,
      });
    }
  } else {
    const usedSheetNames = new Set();
    const safeSheetName = makeUniqueSheetName(sheetName || 'Sheet1', usedSheetNames);
    const ws = wb.addWorksheet(safeSheetName);
    await writeWorksheet({
      ws,
      sheetTitle: title,
      sheetSubtitle: subtitle,
      sheetHeaders: headers,
      sheetRows: rows,
      includeBranding: true,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportTableToPDF({
  filename = 'export.pdf',
  title = '',
  subtitle = '',
  showTitle = false,
  headers = [],
  rows = [],
  orientation = 'landscape',
  headerImageSrc = '',
  tables = null,
}) {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const pdfTheme = (() => {
    const brand = getCssVar('--nb-color-brand', '#4B2C20');
    const border = getCssVar('--nb-color-border', '#E5E7EB');
    const rgb = parseCssColorToRgb(brand, { r: 75, g: 44, b: 32 });
    return {
      headerFillRgb: [rgb.r, rgb.g, rgb.b],
      headerBg: brand,
      gridBorder: border || '#E5E7EB',
      containerPx: orientation === 'portrait' ? 840 : 1120,
      maxRowsPerImage: orientation === 'portrait' ? 28 : 32,
    };
  })();

  const isRtlDoc = (() => {
    try {
      const dir = String(document?.documentElement?.dir || '').toLowerCase();
      return dir === 'rtl';
    } catch {
      return false;
    }
  })();

  const marginX = 40;
  let cursorY = 32;

  if (headerImageSrc) {
    const dataUrl = await loadImageAsDataUrl(headerImageSrc);
    if (dataUrl) {
      const { w, h } = await getImageSize(dataUrl);
      const pageW = doc.internal.pageSize.getWidth();
      const maxW = pageW - marginX * 2;
      const maxH = 70;
      const scale = (w > 0 && h > 0)
        ? Math.min(maxW / w, maxH / h)
        : 1;
      const drawW = Math.max(0, Math.floor((w || 0) * scale));
      const drawH = Math.max(0, Math.floor((h || 0) * scale));
      if (drawW > 0 && drawH > 0) {
        doc.addImage(dataUrl, 'PNG', marginX, cursorY, drawW, drawH);
        cursorY += drawH + 12;
      }
    }
  }

  const safeTitle = String(title || '').trim();
  if (showTitle && safeTitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(toText(safeTitle), marginX, cursorY);
    cursorY += 16;
  }

  const safeSubtitle = String(subtitle || '').trim();
  if (safeSubtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(toText(safeSubtitle), marginX, cursorY);
    cursorY += 12;
  }


  const pageH = doc.internal.pageSize.getHeight();
  const ensureSpace = (needed = 60) => {
    if (cursorY + needed <= pageH - 40) return;
    doc.addPage();
    cursorY = 40;
  };

  const renderOneTable = async ({ tableTitle = '', tableSubtitle = '', tableHeaders = [], tableRows = [] }) => {
    const tTitle = String(tableTitle || '').trim();
    const tSubtitle = String(tableSubtitle || '').trim();

    const safeHeaders = Array.isArray(tableHeaders) ? tableHeaders : [];
    const safeRows = Array.isArray(tableRows) ? tableRows : [];

    // Prevent orphaned titles/subtitles at the bottom of the page.
    // Keep enough room for title+subtitle, table header, and at least a couple rows.
    const metaH = (tTitle ? 14 : 0) + (tSubtitle ? 12 : 0) + 10;
    const tableMinH = 28 /* header */ + 32 /* ~2 rows */;
    ensureSpace(Math.max(120, metaH + tableMinH));

    if (tTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(toText(tTitle), marginX, cursorY);
      cursorY += 14;
    }

    if (tSubtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(toText(tSubtitle), marginX, cursorY);
      cursorY += 12;
    }

    const hasArabic = tableHasArabic(safeHeaders, safeRows);
    if (!hasArabic) {
      autoTable(doc, {
        startY: cursorY + 6,
        head: [safeHeaders.map(toText)],
        body: safeRows.map((r) => (Array.isArray(r) ? r : []).map(toText)),
        theme: 'grid',
        showHead: 'everyPage',
        rowPageBreak: 'avoid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle',
          halign: isRtlDoc ? 'right' : 'left',
        },
        headStyles: {
          fillColor: pdfTheme.headerFillRgb,
          textColor: 255,
          fontStyle: 'bold',
          halign: isRtlDoc ? 'right' : 'left',
        },
        margin: { left: marginX, right: marginX },
      });

      cursorY = (doc.lastAutoTable?.finalY || cursorY) + 22;
      return;
    }

    // Arabic-safe path: render using browser fonts (RTL), then embed as images.
    // Use paged image rendering to avoid canvas size limits for tall tables.
    try {
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const maxW = pageW - marginX * 2;

      const rtl = Boolean(isRtlDoc || hasArabic);
      const imgPages = await buildTableImagePages({
        headers: safeHeaders,
        rows: safeRows,
        theme: pdfTheme,
        rtl,
      });

      for (let i = 0; i < imgPages.length; i += 1) {
        const y0 = i === 0 ? (cursorY + 6) : 40;
        const maxHFirst = pageH - (y0 + 40);
        const page = imgPages[i] || {};

        // eslint-disable-next-line no-await-in-loop
        const res = await addTallImageToPdf({
          doc,
          dataUrl: page.dataUrl,
          format: page.format || 'JPEG',
          imgWpx: page.w || 0,
          imgHpx: page.h || 0,
          x: marginX,
          y: y0,
          maxW,
          maxHFirst,
          marginTop: 40,
        });

        cursorY = (res?.finalY || cursorY) + 22;

        if (i !== imgPages.length - 1) {
          doc.addPage();
          cursorY = 40;
        }
      }
    } catch (e) {
      // If image rendering fails, retry once with smaller settings. If that also fails, fall back to autoTable.
      try {
        const retryTheme = {
          ...pdfTheme,
          containerPx: Math.max(720, Math.floor((pdfTheme?.containerPx || 1120) * 0.85)),
          maxRowsPerImage: Math.max(10, Math.floor((pdfTheme?.maxRowsPerImage || 32) * 0.6)),
          pixelRatio: 1.5,
          jpegQuality: 0.85,
        };

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const maxW = pageW - marginX * 2;

        const rtl = Boolean(isRtlDoc || hasArabic);
        const imgPages = await buildTableImagePages({
          headers: safeHeaders,
          rows: safeRows,
          theme: retryTheme,
          rtl,
        });

        for (let i = 0; i < imgPages.length; i += 1) {
          const y0 = i === 0 ? (cursorY + 6) : 40;
          const maxHFirst = pageH - (y0 + 40);
          const page = imgPages[i] || {};
          // eslint-disable-next-line no-await-in-loop
          const res = await addTallImageToPdf({
            doc,
            dataUrl: page.dataUrl,
            format: page.format || 'JPEG',
            imgWpx: page.w || 0,
            imgHpx: page.h || 0,
            x: marginX,
            y: y0,
            maxW,
            maxHFirst,
            marginTop: 40,
          });

          cursorY = (res?.finalY || cursorY) + 22;

          if (i !== imgPages.length - 1) {
            doc.addPage();
            cursorY = 40;
          }
        }
        return;
      } catch (e2) {
        // eslint-disable-next-line no-console
        console.warn('Arabic PDF image rendering failed twice; falling back to autoTable:', e2);
      }

      // If image rendering fails for any reason, fall back to autoTable so the export still works.
      autoTable(doc, {
        startY: cursorY + 6,
        head: [safeHeaders.map(toText)],
        body: safeRows.map((r) => (Array.isArray(r) ? r : []).map(toText)),
        theme: 'grid',
        showHead: 'everyPage',
        rowPageBreak: 'avoid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle',
          halign: isRtlDoc ? 'right' : 'left',
        },
        headStyles: {
          fillColor: pdfTheme.headerFillRgb,
          textColor: 255,
          fontStyle: 'bold',
          halign: isRtlDoc ? 'right' : 'left',
        },
        margin: { left: marginX, right: marginX },
      });

      cursorY = (doc.lastAutoTable?.finalY || cursorY) + 22;
      // eslint-disable-next-line no-console
      console.warn('Arabic PDF image rendering failed; fell back to autoTable:', e);
    }
  };

  if (Array.isArray(tables) && tables.length > 0) {
    for (const t of tables) {
      const tt = t || {};

      if (tt.pageBreakBefore) {
        doc.addPage();
        cursorY = 40;
      }

      await renderOneTable({
        tableTitle: tt.pdfHideTitle ? '' : (tt.title || ''),
        tableSubtitle: tt.subtitle || '',
        tableHeaders: tt.headers || [],
        tableRows: tt.rows || [],
      });
    }
  } else {
    await renderOneTable({ tableTitle: '', tableSubtitle: '', tableHeaders: headers, tableRows: rows });
  }

  doc.save(filename);
}

export function exportTableToClipboard({
  headers = [],
  rows = [],
  delimiter = '\t',
  tables = null,
  includeMeta = false,
}) {
  const escapeCell = (v) => {
    const text = toText(v);
    // For TSV/CSV, normalize line breaks.
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  };

  const buildTableLines = ({ title = '', subtitle = '', tableHeaders = [], tableRows = [] }) => {
    const safeHeaders = Array.isArray(tableHeaders) ? tableHeaders : [];
    const safeRows = Array.isArray(tableRows) ? tableRows : [];
    const colCount = Math.max(
      1,
      safeHeaders.length,
      ...safeRows.map((r) => (Array.isArray(r) ? r.length : 0)),
    );

    const padRow = (cells) => {
      const arr = Array.isArray(cells) ? cells : [];
      const padded = arr.slice(0, colCount);
      while (padded.length < colCount) padded.push('');
      return padded;
    };

    const lines = [];
    if (includeMeta) {
      const t = String(title || '').trim();
      const s = String(subtitle || '').trim();
      if (t) lines.push(padRow([t]).map(escapeCell).join(delimiter));
      if (s) lines.push(padRow([s]).map(escapeCell).join(delimiter));
    }

    // Keep clipboard output tabular so pasting into Excel stays aligned.
    lines.push(padRow(safeHeaders).map(escapeCell).join(delimiter));
    for (const r of safeRows) {
      lines.push(padRow(r).map(escapeCell).join(delimiter));
    }
    return lines;
  };

  let text = '';
  if (Array.isArray(tables) && tables.length > 0) {
    const blocks = [];
    for (const t of tables) {
      const tt = t || {};
      blocks.push(
        ...buildTableLines({
          title: tt.title || '',
          subtitle: tt.subtitle || '',
          tableHeaders: tt.headers || [],
          tableRows: tt.rows || [],
        }),
      );
      blocks.push('');
    }
    text = blocks.join('\n').replace(/\s+$/g, '');
  } else {
    text = buildTableLines({ title: '', subtitle: '', tableHeaders: headers, tableRows: rows }).join('\n');
  }

  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
  return Promise.resolve();
}
