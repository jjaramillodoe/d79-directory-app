const test = require('node:test');
const assert = require('node:assert/strict');
const { sortForms, filterForms, FORM_SORT_OPTIONS } = require('./formSort');

const forms = [
  { _id: 'b', schoolName: 'Pathways', status: 'submitted', completedSteps: [1, 2, 3], createdAt: '2026-09-02', updatedAt: '2026-11-01' },
  { _id: 'a', schoolName: 'adult learning center', status: 'draft', completedSteps: [1], createdAt: '2026-09-01', updatedAt: '2026-11-20' },
  { _id: 'c', schoolName: 'Co-op Tech', status: 'draft', completedSteps: [], createdAt: '2026-09-03', updatedAt: null },
];
const ids = (list) => list.map((f) => f._id);

test('school sort ignores case', () => {
  assert.deepEqual(ids(sortForms(forms, 'school-asc')), ['a', 'c', 'b']);
  assert.deepEqual(ids(sortForms(forms, 'school-desc')), ['b', 'c', 'a']);
});

test('date and progress sorts, missing dates last', () => {
  assert.deepEqual(ids(sortForms(forms, 'updated-desc')), ['a', 'b', 'c']);
  assert.deepEqual(ids(sortForms(forms, 'created-asc')), ['a', 'b', 'c']);
  assert.deepEqual(ids(sortForms(forms, 'progress-desc')), ['b', 'a', 'c']);
});

test('ties fall back to school name, and the input is not mutated', () => {
  const copy = [...forms];
  assert.deepEqual(ids(sortForms(forms, 'status')), ['a', 'c', 'b']);
  assert.deepEqual(forms, copy);
});

test('most shared uses the supplied counts', () => {
  const counts = { a: 0, b: 1, c: 4 };
  assert.deepEqual(ids(sortForms(forms, 'shared-desc', { shareCount: (f) => counts[f._id] })), ['c', 'b', 'a']);
});

test('every listed option sorts without throwing; unknown keys fall back to school', () => {
  FORM_SORT_OPTIONS.forEach(({ value }) => assert.equal(sortForms(forms, value).length, 3));
  assert.deepEqual(ids(sortForms(forms, 'nope')), ['a', 'c', 'b']);
});

test('search matches school and status, case-insensitive', () => {
  assert.deepEqual(ids(filterForms(forms, 'CO-OP')), ['c']);
  assert.deepEqual(ids(filterForms(forms, 'submitted')), ['b']);
  assert.equal(filterForms(forms, '  ').length, 3);
});
