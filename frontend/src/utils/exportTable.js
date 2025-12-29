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
  if (/[\n\r,\"]/g.test(text)) {
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
}) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const colCount = Math.max(1, safeHeaders.length);
  const padRow = (cells) => {
    const arr = Array.isArray(cells) ? cells : [];
    const padded = arr.slice(0, colCount);
    while (padded.length < colCount) padded.push('');
    return padded;
  };

  const lines = [];
  if (includeMetaRows) {
    if (title) lines.push(padRow([title]).map(csvEscape).join(','));
    if (subtitle) lines.push(padRow([subtitle]).map(csvEscape).join(','));
    if (title || subtitle) lines.push(padRow(['']).map(csvEscape).join(','));
  }

  lines.push(padRow(safeHeaders).map(csvEscape).join(','));
  for (const r of safeRows) {
    lines.push(padRow(r).map(csvEscape).join(','));
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
}) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const colCount = Math.max(1, safeHeaders.length);

  const safeSheetName = String(sheetName || 'Sheet1')
    .replace(/[\\/\?\*\[\]:]/g, ' ')
    .trim()
    .slice(0, 31) || 'Sheet1';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nuuru Al-Bayaan';
  wb.created = new Date();

  const ws = wb.addWorksheet(safeSheetName);
  ws.properties.defaultRowHeight = 18;

  const mergeAcross = (rowIndex) => {
    // ExcelJS signature: mergeCells(startRow, startCol, endRow, endCol)
    if (colCount > 1) ws.mergeCells(rowIndex, 1, rowIndex, colCount);
  };

  let rowCursor = 1;

  // 1) Add header image (branding) if provided
  if (headerImageSrc) {
    const dataUrl = await loadImageAsDataUrl(headerImageSrc);
    if (dataUrl) {
      // data:image/png;base64,....
      const base64 = String(dataUrl).split(',')[1] || '';
      if (base64) {
        const imageId = wb.addImage({ base64, extension: 'png' });
        // Reserve rows so the image doesn't overlap the table.
        for (let r = 1; r <= 6; r += 1) ws.getRow(r).height = 18;

        // Place image top-center (approx). ExcelJS uses pixel sizing.
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
  if (title) {
    mergeAcross(rowCursor);
    const c = ws.getCell(rowCursor, 1);
    c.value = toText(title);
    c.font = { bold: true, size: 14 };
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    rowCursor += 1;
  }
  if (subtitle) {
    mergeAcross(rowCursor);
    const c = ws.getCell(rowCursor, 1);
    c.value = toText(subtitle);
    c.font = { size: 10, color: { argb: 'FF374151' } };
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    rowCursor += 1;
  }
  if (title || subtitle) rowCursor += 1;

  // 3) Header row
  const headerRowIndex = rowCursor;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = [null, ...safeHeaders.map(toText)];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  headerRow.height = 20;
  rowCursor += 1;

  // 4) Data rows
  const dataStartRowIndex = rowCursor;
  for (const rawRow of safeRows) {
    const row = ws.getRow(rowCursor);
    const values = (Array.isArray(rawRow) ? rawRow : []).map(toText);
    row.values = [null, ...values];
    rowCursor += 1;
  }

  // Borders + widths: sample first N rows for stable widths
  const sampleN = Math.min(50, safeRows.length);
  const widths = Array.from({ length: colCount }).map((_, cIdx) => {
    let maxLen = safeHeaders[cIdx] ? String(safeHeaders[cIdx]).length : 0;
    for (let i = 0; i < sampleN; i += 1) {
      const v = Array.isArray(safeRows[i]) ? safeRows[i][cIdx] : '';
      maxLen = Math.max(maxLen, String(toText(v)).length);
    }
    return Math.min(40, Math.max(12, Math.ceil(maxLen * 1.1)));
  });

  ws.columns = widths.map((w) => ({ width: w }));

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    // Skip rows above the header row if they are part of the image/title spacing.
    if (rowNumber < headerRowIndex) return;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (rowNumber !== headerRowIndex) {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      }
    });
  });

  // Avoid frozen panes (thick black line in Excel looks like a bug).
  ws.views = [{ state: 'normal' }];

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
}) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];

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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(toText(title), marginX, cursorY);

  cursorY += 16;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(toText(subtitle), marginX, cursorY);
    cursorY += 12;
  }

  autoTable(doc, {
    startY: cursorY + 8,
    head: [safeHeaders.map(toText)],
    body: safeRows.map((r) => (Array.isArray(r) ? r : []).map(toText)),
    theme: 'grid',
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

  doc.save(filename);
}

export function exportTableToClipboard({ title = '', subtitle = '', headers = [], rows = [], delimiter = '\t' }) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const colCount = Math.max(1, safeHeaders.length);

  const padRow = (cells) => {
    const arr = Array.isArray(cells) ? cells : [];
    const padded = arr.slice(0, colCount);
    while (padded.length < colCount) padded.push('');
    return padded;
  };

  const escapeCell = (v) => {
    const text = toText(v);
    // For TSV/CSV, normalize line breaks.
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  };

  const lines = [];
  // Keep clipboard output as a clean table so pasting into Excel stays aligned.
  // (If you want title/subtitle, add them to the sheet/PDF; clipboard stays tabular.)
  lines.push(padRow(safeHeaders).map(escapeCell).join(delimiter));
  for (const r of safeRows) {
    lines.push(padRow(r).map(escapeCell).join(delimiter));
  }
  const text = lines.join('\n');

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
