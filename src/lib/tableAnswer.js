const MAX_ROWS = 100;
const MAX_COLS = 20;

function isTableValue(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (Array.isArray(value.headers) || Array.isArray(value.rows))
  );
}

function cleanCell(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function padRow(row, width) {
  const next = (row || []).slice(0, width).map(cleanCell);
  while (next.length < width) next.push('');
  return next;
}

function defaultHeaders(count) {
  const width = Math.min(MAX_COLS, Math.max(1, count || 3));
  return Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
}

function parseDelimited(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!raw.trim()) return [];
  const lines = raw.split('\n').filter((line, index, all) => line.length > 0 || index < all.length - 1);
  const tabRows = lines.map((line) => line.split('\t'));
  const tabWidth = Math.max(0, ...tabRows.map((row) => row.length));
  if (tabWidth > 1) return tabRows;

  const commaRows = lines.map((line) => line.split(',').map((cell) => cell.trim()));
  const commaWidth = Math.max(0, ...commaRows.map((row) => row.length));
  const consistent = commaRows.length > 1 && commaRows.every((row) => row.length === commaWidth);
  if (commaWidth > 2 && consistent) return commaRows;

  return lines.map((line) => [line]);
}

function looksLikeHeaderRow(row, headers) {
  if (!row?.length || !headers?.length) return false;
  const cells = row.map((cell) => cleanCell(cell).toLowerCase());
  const wanted = headers.map((cell) => cleanCell(cell).toLowerCase()).filter(Boolean);
  if (!wanted.length) return false;
  const hits = wanted.filter((header) => cells.includes(header)).length;
  return hits >= Math.min(2, wanted.length) || cells[0] === wanted[0];
}

function gridToTable(grid, { columns } = {}) {
  const locked = Array.isArray(columns) && columns.length > 0
    ? columns.map(cleanCell).filter(Boolean).slice(0, MAX_COLS)
    : [];
  const matrix = (grid || [])
    .map((row) => (Array.isArray(row) ? row.map(cleanCell) : [cleanCell(row)]))
    .filter((row) => row.some((cell) => cell.length > 0) || row.length > 1)
    .slice(0, MAX_ROWS + 1);

  if (locked.length) {
    const data = looksLikeHeaderRow(matrix[0], locked) ? matrix.slice(1) : matrix;
    const rows = (data.length ? data : [[]]).slice(0, MAX_ROWS).map((row) => padRow(row, locked.length));
    return { headers: locked, rows };
  }

  if (!matrix.length) {
    const headers = defaultHeaders(3);
    return { headers, rows: [padRow([], headers.length)] };
  }

  const width = Math.min(MAX_COLS, Math.max(1, ...matrix.map((row) => row.length)));
  const headers = padRow(matrix[0], width).map((cell, index) => cell || `Column ${index + 1}`);
  const data = matrix.slice(1);
  const rows = (data.length ? data : [[]]).slice(0, MAX_ROWS).map((row) => padRow(row, width));
  return { headers, rows };
}

function normalizeTable(value, { columns } = {}) {
  if (isTableValue(value)) {
    const locked = Array.isArray(columns) && columns.length > 0
      ? columns.map(cleanCell).filter(Boolean).slice(0, MAX_COLS)
      : [];
    const headers = (locked.length ? locked : (value.headers || []).map(cleanCell))
      .filter(Boolean)
      .slice(0, MAX_COLS);
    const width = headers.length || 3;
    const nextHeaders = headers.length ? headers : defaultHeaders(width);
    const sourceRows = Array.isArray(value.rows) && value.rows.length ? value.rows : [[]];
    return {
      headers: nextHeaders,
      rows: sourceRows.slice(0, MAX_ROWS).map((row) => padRow(row, nextHeaders.length)),
    };
  }

  if (typeof value === 'string' && value.trim()) {
    return gridToTable(parseDelimited(value), { columns });
  }

  return gridToTable([], { columns });
}

function isTableAnswered(value) {
  const table = isTableValue(value) || typeof value === 'string' ? normalizeTable(value) : value;
  if (!table?.rows) return false;
  return table.rows.some((row) => (row || []).some((cell) => cleanCell(cell).length > 0));
}

function formatTablePlain(value, { cellSep = ' | ', rowSep = '\n' } = {}) {
  if (!isTableValue(value) && typeof value !== 'string') {
    if (!value) return '';
  }
  const table = normalizeTable(value);
  if (!isTableAnswered(table)) return '';
  const lines = [
    table.headers.join(cellSep),
    ...table.rows.map((row) => row.join(cellSep)),
  ];
  return lines.join(rowSep);
}

function textLooksLikeGrid(text) {
  if (!text) return false;
  if (text.includes('\t')) return true;
  const lines = String(text).trim().split(/\n/).filter(Boolean);
  if (lines.length < 2) return false;
  const widths = lines.map((line) => line.split('\t').length);
  return widths.some((width) => width > 1);
}

module.exports = {
  MAX_ROWS,
  MAX_COLS,
  isTableValue,
  isTableAnswered,
  cleanCell,
  parseDelimited,
  gridToTable,
  normalizeTable,
  formatTablePlain,
  textLooksLikeGrid,
};
