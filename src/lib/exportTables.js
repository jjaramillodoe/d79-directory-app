const {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
} = require('docx');
const { isTableValue, isTableAnswered, normalizeTable, cleanCell, normalizeColumnDefs } = require('./tableAnswer');
const { formatYesNo } = require('./questionBankUtils');

// Unanswered questions print as a ruled line so the exported plan can be completed on paper.
const ANSWER_PLACEHOLDER = '_______________________________________________________';

function pdfSafe(text) {
  return String(text ?? '')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7E\n\r]/g, '')
    .trim();
}

function resolveExportTable(value, columns, { always = false } = {}) {
  if (isTableValue(value)) {
    return normalizeTable(value, { columns });
  }
  if (typeof value === 'string' && value.trim()) {
    const table = normalizeTable(value, { columns });
    if (isTableAnswered(table) || always) return table;
  }
  if (always && normalizeColumnDefs(columns).length) {
    return normalizeTable(value || '', { columns });
  }
  return null;
}

function cellText(value) {
  return cleanCell(value);
}

function docxBorders(color = '083258') {
  const edge = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: edge, bottom: edge, left: edge, right: edge };
}

function buildDocxTable(table) {
  const headers = table.headers || [];
  const rows = table.rows && table.rows.length ? table.rows : [headers.map(() => '')];
  const width = Math.max(1, headers.length);
  const TOTAL_DXA = 9360;
  const colWidthDxa = Math.floor(TOTAL_DXA / width);

  const makeCell = (text, header = false) =>
    new TableCell({
      width: { size: colWidthDxa, type: WidthType.DXA },
      borders: docxBorders(),
      shading: header ? { type: ShadingType.CLEAR, fill: '083258' } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: cellText(text) || (header ? '' : ' '),
              bold: header,
              color: header ? 'FFFFFF' : '1F2937',
              size: 16,
            }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: TOTAL_DXA, type: WidthType.DXA },
    columnWidths: headers.map(() => colWidthDxa),
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header) => makeCell(header, true)),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: headers.map((_, index) => makeCell(row[index] || '')),
          })
      ),
    ],
  });
}

function drawPdfTable(doc, table) {
  const headers = (table.headers || []).map((header) => pdfSafe(header) || ' ');
  const rows = (table.rows && table.rows.length ? table.rows : [headers.map(() => '')]).map((row) =>
    headers.map((_, index) => pdfSafe(row[index]))
  );
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const colCount = Math.max(1, headers.length);
  const colWidth = pageWidth / colCount;
  const pad = 4;
  const fontSize = headers.length > 5 ? 7 : 8;
  const navy = '#083258';

  const rowHeight = (cells, header) => {
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    const heights = cells.map((cell) => {
      const text = cell || ' ';
      return doc.heightOfString(text, { width: Math.max(12, colWidth - pad * 2) }) + pad * 2;
    });
    return Math.max(16, ...heights);
  };

  const ensureSpace = (needed) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      doc.font('Helvetica').fontSize(fontSize);
    }
  };

  const drawRow = (cells, header = false) => {
    const height = rowHeight(cells, header);
    ensureSpace(height);
    const y = doc.y;
    cells.forEach((cell, index) => {
      const x = startX + index * colWidth;
      if (header) {
        doc.save();
        doc.rect(x, y, colWidth, height).fill(navy);
        doc.restore();
      }
      doc.save();
      doc.lineWidth(0.6).strokeColor(navy).rect(x, y, colWidth, height).stroke();
      doc.restore();
      doc.fillColor(header ? '#FFFFFF' : '#1F2937')
        .font(header ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fontSize)
        .text(cell || ' ', x + pad, y + pad, {
          width: colWidth - pad * 2,
          height: height - pad * 2,
          lineGap: 0,
          ellipsis: true,
        });
    });
    doc.y = y + height;
    doc.x = startX;
    doc.fillColor('#000000');
  };

  drawRow(headers, true);
  rows.forEach((row) => drawRow(row, false));
  doc.x = startX;
  doc.fillColor('#000000');
  doc.moveDown(0.6);
}

/**
 * Decides how one answer should appear in an exported document.
 *
 * The PDF and DOCX routes ran byte-identical copies of this, so a change to how (say)
 * checkbox answers render had to be made twice or the two formats silently disagreed.
 *
 * Deliberately not merged into `schoolYearSettings.formatAnswer`, despite the surface
 * similarity: that one serves the year-over-year comparison view, where it renders booleans
 * as 'Yes'/'No', flattens tables to plain text for diffing, and emits compact JSON. Exports
 * need `formatYesNo`, real table objects to hand to the table builders, indented JSON, and a
 * ruled placeholder for blanks. Folding them together would have quietly changed both.
 *
 * @param {object} question - Question definition, for `type` and `columns`.
 * @param {*} value - The stored answer.
 * @param {{ maxLength?: number }} [options] - Truncate beyond maxLength (PDF only, since
 *   PDFKit lays out a single enormous string very slowly).
 * @returns {{ table: object|null, hasData: boolean, displayValue: string }}
 */
function resolveExportAnswer(question, value, { maxLength } = {}) {
  const table = resolveExportTable(value, question.columns, {
    always: question.type === 'table',
  });
  const isChoice = question.type === 'yesno' || question.type === 'checkbox';

  const hasData = table
    ? isTableAnswered(table)
    : isChoice
      ? Boolean(formatYesNo(value))
      : value !== undefined && value !== null && value !== '';

  let displayValue = '';

  if (!table && hasData) {
    if (isChoice) {
      displayValue = formatYesNo(value);
    } else if (typeof value === 'object' && value !== null) {
      displayValue = Array.isArray(value) ? value.join(', ') : JSON.stringify(value, null, 2);
    } else {
      displayValue = String(value || '');
    }

    if (maxLength && displayValue.length > maxLength) {
      displayValue = `${displayValue.substring(0, maxLength)}... (truncated)`;
    }
  } else if (!table) {
    displayValue = ANSWER_PLACEHOLDER;
  }

  return { table, hasData, displayValue };
}

module.exports = {
  resolveExportTable,
  resolveExportAnswer,
  buildDocxTable,
  drawPdfTable,
  pdfSafe,
  ANSWER_PLACEHOLDER,
};
