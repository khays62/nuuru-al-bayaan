import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

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
  headerImageSrc = '',
  headers = [],
  rows = [],
  sheets = null,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nuuru Al-Bayaan';
  wb.created = new Date();

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
    if (sheetTitle) {
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
    if (sheetTitle || sheetSubtitle) rowCursor += 1;

    // 3) Header row
    const headerRowIndex = rowCursor;
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.values = [null, ...safeHeaders.map(toText)];
    for (let c = 1; c <= colCount; c += 1) {
      const cell = headerRow.getCell(c);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    }
    headerRow.height = 20;
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
      return Math.min(maxW, Math.max(minW, Math.ceil(maxLen * 1.1)));
    });

    ws.columns = widths.map((w) => ({ width: w }));

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < headerRowIndex) return;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
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
  title = 'Report',
  subtitle = '',
  headers = [],
  rows = [],
  orientation = 'landscape',
  headerImageSrc = '',
  tables = null,
}) {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

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
  if (safeTitle) {
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

  const renderOneTable = ({ tableTitle = '', tableSubtitle = '', tableHeaders = [], tableRows = [] }) => {
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
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: 255,
        fontStyle: 'bold',
      },
      margin: { left: marginX, right: marginX },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 22;
  };

  if (Array.isArray(tables) && tables.length > 0) {
    for (const t of tables) {
      const tt = t || {};

      if (tt.pageBreakBefore) {
        doc.addPage();
        cursorY = 40;
      }

      renderOneTable({
        tableTitle: tt.pdfHideTitle ? '' : (tt.title || ''),
        tableSubtitle: tt.subtitle || '',
        tableHeaders: tt.headers || [],
        tableRows: tt.rows || [],
      });
    }
  } else {
    renderOneTable({ tableTitle: '', tableSubtitle: '', tableHeaders: headers, tableRows: rows });
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
