const {
  looksLikeContactColumns,
  parseContactsAsTable,
  CONTACT_TABLE_PRESET,
} = require('./contactTextParser');

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

const GRADE_LEVEL_OPTIONS = [
  '6,7, 8, 9, 10, 11, and 12',
  'All',
  'Literacy-Elementary (K-5)',
  'Pre-HSE Middle School (6-8)',
  'HSE-High School (9-12)',
];

const TIMELINE_OPTIONS = [
  'September to June',
  'Ongoing',
  'As needed',
  'First Quarter',
  'Second Quarter',
  'Third Quarter',
  'Fourth Quarter',
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
  'First Semester',
  'Second Semester',
  'Third Semester',
  'Fourth Semester',
];

function textColumns(headers) {
  return headers.map((header) => ({ header, type: 'text', options: [] }));
}

const PROGRAM_TABLE_PRESET = [
  { header: 'Program Name', type: 'text', options: [] },
  { header: 'Grade Level', type: 'select', options: GRADE_LEVEL_OPTIONS },
  { header: 'Timeline', type: 'select', options: TIMELINE_OPTIONS },
];

const STAFF_CONTACT_HEADERS = ['First Name', 'Last Name', 'Title', 'Email', 'Telephone'];

const TABLE_COLUMN_PRESETS = [
  {
    id: 'staff',
    label: 'Staff contact',
    columns: textColumns(STAFF_CONTACT_HEADERS),
  },
  {
    id: 'staffCertified',
    label: 'Staff + certified',
    columns: [
      ...textColumns(STAFF_CONTACT_HEADERS),
      { header: 'Certified', type: 'select', options: ['Yes', 'No'] },
      { header: 'Training Date', type: 'text', options: [] },
    ],
  },
  {
    id: 'staffSchedule',
    label: 'Staff + room / time',
    columns: textColumns([...STAFF_CONTACT_HEADERS, 'Room Number', 'Start Time', 'End Time']),
  },
  {
    id: 'programHours',
    label: 'Program hours',
    columns: textColumns(['Program', 'Start Time', 'End Time', 'Days']),
  },
  {
    id: 'programGrade',
    label: 'Program / Grade / Timeline',
    columns: PROGRAM_TABLE_PRESET,
  },
  {
    id: 'contactNotes',
    label: 'Contact + notes',
    columns: CONTACT_TABLE_PRESET,
  },
];

function parseOptions(value) {
  if (Array.isArray(value)) {
    return value.map(cleanCell).filter(Boolean).slice(0, 40);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n/)
      .map(cleanCell)
      .filter(Boolean)
      .slice(0, 40);
  }
  return [];
}

function tokenizeColumnBlueprint(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_COLS);

  if (lines.length === 1 && lines[0].includes(',') && !lines[0].includes('|')) {
    return lines[0].split(',').map(cleanCell).filter(Boolean).slice(0, MAX_COLS);
  }
  return lines.map(cleanCell).filter(Boolean);
}

function parseOptionList(raw) {
  const source = String(raw || '').trim();
  if (!source) return [];
  if (source.includes(';')) {
    return parseOptions(source.split(';'));
  }
  return parseOptions(source.split(','));
}

function parseColumnLine(token) {
  const source = cleanCell(token);
  if (!source) return null;
  const pipe = source.indexOf('|');
  if (pipe === -1) {
    return { header: source, type: 'text', options: [] };
  }
  const header = cleanCell(source.slice(0, pipe));
  if (!header) return null;
  const options = parseOptionList(source.slice(pipe + 1));
  if (options.length) return { header, type: 'select', options };
  return { header, type: 'text', options: [] };
}

function parseColumnBlueprint(text, previous = []) {
  const previousDefs = Array.isArray(previous) ? previous : [];
  return tokenizeColumnBlueprint(text)
    .map((token) => {
      const parsed = parseColumnLine(token);
      if (!parsed) return null;
      if (parsed.type === 'select') return parsed;
      const match = previousDefs.find(
        (column) => cleanCell(column?.header).toLowerCase() === parsed.header.toLowerCase()
      );
      if (match?.type === 'select' && Array.isArray(match.options) && match.options.length) {
        return { header: parsed.header, type: 'select', options: [...match.options] };
      }
      return parsed;
    })
    .filter(Boolean);
}

function formatColumnBlueprint(columns) {
  return normalizeColumnDefs(columns)
    .map((column) => {
      if (column.type !== 'select' || !column.options.length) return column.header;
      const joiner = column.options.some((option) => String(option).includes(',')) ? '; ' : ', ';
      return `${column.header} | ${column.options.join(joiner)}`;
    })
    .join('\n');
}

function cloneColumnPreset(columns) {
  return normalizeColumnDefs(columns).map((column) => ({
    header: column.header,
    type: column.type,
    options: [...(column.options || [])],
  }));
}

function normalizeColumnDefs(columns) {
  if (typeof columns === 'string') {
    return parseColumnBlueprint(columns);
  }
  if (!Array.isArray(columns) || !columns.length) return [];
  return columns
    .slice(0, MAX_COLS)
    .map((column) => {
      if (typeof column === 'string') {
        return parseColumnLine(column);
      }
      const header = cleanCell(column?.header || column?.label || column?.title || '');
      if (!header) return null;
      const type = column.type === 'select' || column.input === 'select' ? 'select' : 'text';
      return {
        header,
        type,
        options: type === 'select' ? parseOptions(column.options) : [],
      };
    })
    .filter(Boolean);
}

function columnHeaders(columns) {
  return normalizeColumnDefs(columns).map((column) => column.header);
}

function matchSelectOption(value, options) {
  const cell = cleanCell(value);
  if (!cell || !options?.length) return cell;
  const lower = cell.toLowerCase();
  const hit = options.find((option) => option.toLowerCase() === lower);
  return hit || cell;
}

function applyColumnTypes(table, columns) {
  const defs = normalizeColumnDefs(columns);
  if (!defs.some((def) => def.type === 'select' && def.options.length)) return table;
  return {
    headers: table.headers,
    rows: table.rows.map((row) =>
      row.map((cell, index) => {
        const def = defs[index];
        if (def?.type === 'select' && def.options.length) {
          return matchSelectOption(cell, def.options);
        }
        return cell;
      })
    ),
  };
}

function gridToTable(grid, { columns } = {}) {
  const locked = columnHeaders(columns);
  const matrix = (grid || [])
    .map((row) => (Array.isArray(row) ? row.map(cleanCell) : [cleanCell(row)]))
    .filter((row) => row.some((cell) => cell.length > 0) || row.length > 1)
    .slice(0, MAX_ROWS + 1);

  if (locked.length) {
    const data = looksLikeHeaderRow(matrix[0], locked) ? matrix.slice(1) : matrix;
    const rows = (data.length ? data : [[]]).slice(0, MAX_ROWS).map((row) => padRow(row, locked.length));
    return applyColumnTypes({ headers: locked, rows }, columns);
  }

  if (!matrix.length) {
    const headers = defaultHeaders(3);
    return applyColumnTypes({ headers, rows: [padRow([], headers.length)] }, columns);
  }

  const width = Math.min(MAX_COLS, Math.max(1, ...matrix.map((row) => row.length)));
  const headers = padRow(matrix[0], width).map((cell, index) => cell || `Column ${index + 1}`);
  const data = matrix.slice(1);
  const rows = (data.length ? data : [[]]).slice(0, MAX_ROWS).map((row) => padRow(row, width));
  return applyColumnTypes({ headers, rows }, columns);
}

function normalizeTable(value, { columns } = {}) {
  if (isTableValue(value)) {
    const locked = columnHeaders(columns);
    const headers = (locked.length ? locked : (value.headers || []).map(cleanCell))
      .filter(Boolean)
      .slice(0, MAX_COLS);
    const width = headers.length || 3;
    const nextHeaders = headers.length ? headers : defaultHeaders(width);
    const sourceRows = Array.isArray(value.rows) && value.rows.length ? value.rows : [[]];
    return applyColumnTypes(
      {
        headers: nextHeaders,
        rows: sourceRows.slice(0, MAX_ROWS).map((row) => padRow(row, nextHeaders.length)),
      },
      columns
    );
  }

  if (typeof value === 'string' && value.trim()) {
    const grid = parseDelimited(value);
    const width = Math.max(0, ...grid.map((row) => row.length));
    if (width > 1) return gridToTable(grid, { columns });
    if (looksLikeContactColumns(columns)) {
      return parseContactsAsTable(value, { columns: normalizeColumnDefs(columns) });
    }
    return gridToTable([], { columns });
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
  GRADE_LEVEL_OPTIONS,
  TIMELINE_OPTIONS,
  PROGRAM_TABLE_PRESET,
  CONTACT_TABLE_PRESET,
  TABLE_COLUMN_PRESETS,
  parseColumnBlueprint,
  formatColumnBlueprint,
  cloneColumnPreset,
  isTableValue,
  isTableAnswered,
  cleanCell,
  parseOptions,
  normalizeColumnDefs,
  columnHeaders,
  matchSelectOption,
  applyColumnTypes,
  parseDelimited,
  gridToTable,
  normalizeTable,
  formatTablePlain,
  textLooksLikeGrid,
};
