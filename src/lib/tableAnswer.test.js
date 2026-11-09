const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseColumnBlueprint,
  formatColumnBlueprint,
  normalizeColumnDefs,
  normalizeTable,
  isTableAnswered,
  TABLE_COLUMN_PRESETS,
} = require('./tableAnswer');

test('keepWhitespace leaves a trailing space so a second word can be typed', () => {
  const value = { headers: ['Title'], rows: [['Assistant ']] };
  const table = normalizeTable(value, { keepWhitespace: true });
  assert.equal(table.rows[0][0], 'Assistant ');
});

test('keepWhitespace still applies to unlocked headers and cleans nbsp', () => {
  const table = normalizeTable(
    { headers: ['Start '], rows: [['a ']] },
    { keepWhitespace: true }
  );
  assert.equal(table.headers[0], 'Start ');
  assert.equal(table.rows[0][0], 'a ');
});

test('display normalization still trims saved cells', () => {
  const table = normalizeTable({ headers: ['Title'], rows: [['Principal ']] });
  assert.equal(table.rows[0][0], 'Principal');
});

test('clearing a header while editing keeps the column and its data', () => {
  const table = normalizeTable(
    { headers: ['Name', '', 'Room'], rows: [['Ana', 'AP', '101']] },
    { keepWhitespace: true }
  );
  assert.deepEqual(table.headers, ['Name', '', 'Room']);
  assert.deepEqual(table.rows[0], ['Ana', 'AP', '101']);
});

test('a saved blank header displays a fallback name without shifting data', () => {
  const table = normalizeTable({ headers: ['Name', '', 'Room'], rows: [['Ana', 'AP', '101']] });
  assert.deepEqual(table.headers, ['Name', 'Column 2', 'Room']);
  assert.deepEqual(table.rows[0], ['Ana', 'AP', '101']);
});

test('a row of only spaces does not count as answered', () => {
  assert.equal(isTableAnswered({ headers: ['Title'], rows: [['   ']] }), false);
});

test('one column name per line becomes text columns', () => {
  const columns = parseColumnBlueprint(
    ['First Name', 'Last Name', 'Title', 'Email', 'Telephone'].join('\n')
  );
  assert.deepEqual(
    columns.map((column) => column.header),
    ['First Name', 'Last Name', 'Title', 'Email', 'Telephone']
  );
  assert.equal(columns.every((column) => column.type === 'text'), true);
});

test('a comma-separated header row also works', () => {
  const columns = parseColumnBlueprint('Program, Start Time, End Time, Days');
  assert.deepEqual(
    columns.map((column) => column.header),
    ['Program', 'Start Time', 'End Time', 'Days']
  );
});

test('pipe syntax makes a dropdown without splitting option commas into columns', () => {
  const columns = parseColumnBlueprint('Certified | Yes, No\nTraining Date');
  assert.equal(columns[0].header, 'Certified');
  assert.equal(columns[0].type, 'select');
  assert.deepEqual(columns[0].options, ['Yes', 'No']);
  assert.equal(columns[1].header, 'Training Date');
  assert.equal(columns[1].type, 'text');
});

test('editing the textarea keeps dropdown options for a renamed-in-place header', () => {
  const previous = parseColumnBlueprint('Certified | Yes, No');
  const next = parseColumnBlueprint('Certified', previous);
  assert.equal(next[0].type, 'select');
  assert.deepEqual(next[0].options, ['Yes', 'No']);
});

test('format writes dropdowns back as pipe lines', () => {
  const text = formatColumnBlueprint(TABLE_COLUMN_PRESETS.find((item) => item.id === 'staffCertified').columns);
  assert.equal(text.includes('Certified | Yes, No'), true);
  assert.equal(text.includes('First Name'), true);
});

test('grade options that contain commas use semicolons in the textarea', () => {
  const preset = TABLE_COLUMN_PRESETS.find((item) => item.id === 'programGrade');
  const text = formatColumnBlueprint(preset.columns);
  const parsed = parseColumnBlueprint(text);
  const grade = parsed.find((column) => column.header === 'Grade Level');
  assert.equal(grade.type, 'select');
  assert.equal(grade.options.includes('6,7, 8, 9, 10, 11, and 12'), true);
  assert.equal(grade.options.includes('All'), true);
});

test('normalizeColumnDefs understands the same textarea syntax', () => {
  const columns = normalizeColumnDefs('Grade Level | All, 6-8, 9-12');
  assert.equal(columns[0].type, 'select');
  assert.equal(columns[0].options.length, 3);
});
