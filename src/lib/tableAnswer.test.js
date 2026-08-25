const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseColumnBlueprint,
  formatColumnBlueprint,
  normalizeColumnDefs,
  TABLE_COLUMN_PRESETS,
} = require('./tableAnswer');

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
