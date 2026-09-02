const test = require('node:test');
const assert = require('node:assert');
const { normalizeSchoolName, schoolNameKey, httpError } = require('./schoolCatalog');

test('normalizeSchoolName trims and collapses spaces', () => {
  assert.equal(normalizeSchoolName('  Passages   Academy  '), 'Passages Academy');
  assert.equal(normalizeSchoolName(''), '');
});

test('schoolNameKey is case-insensitive', () => {
  assert.equal(schoolNameKey('Passages Academy'), schoolNameKey('passages academy'));
  assert.equal(schoolNameKey('PS  1'), 'ps 1');
});

test('httpError carries a 4xx status for clientSafeMessage', () => {
  const error = httpError(409, 'A school with this name already exists');
  assert.equal(error.status, 409);
  assert.equal(error.message, 'A school with this name already exists');
});
