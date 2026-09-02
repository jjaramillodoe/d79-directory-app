const test = require('node:test');
const assert = require('node:assert/strict');
const { clientSafeMessage, schoolScopeFilter, bulkTargetFilter } = require('./userAccess');

function domainError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

test('clientSafeMessage passes through deliberate 4xx messages', () => {
  assert.equal(
    clientSafeMessage(domainError('A 2027-2028 plan already exists', 409), 'fallback'),
    'A 2027-2028 plan already exists'
  );
  assert.equal(clientSafeMessage(domainError('Enter a school year', 400), 'fallback'), 'Enter a school year');
  assert.equal(clientSafeMessage(domainError('Form not found', 404), 'fallback'), 'Form not found');
});

test('clientSafeMessage hides unexpected error text', () => {
  // The cases that leaked schema internals: Mongoose validation, cast and duplicate-key
  // errors all arrive with no status.
  assert.equal(
    clientSafeMessage(new Error('E11000 duplicate key error collection: d79.users index: email_1'), 'fallback'),
    'fallback'
  );
  assert.equal(
    clientSafeMessage(new Error('Cast to ObjectId failed for value "abc" at path "_id"'), 'fallback'),
    'fallback'
  );
  assert.equal(clientSafeMessage(null, 'fallback'), 'fallback');
  assert.equal(clientSafeMessage(undefined, 'fallback'), 'fallback');
});

test('clientSafeMessage does not trust 5xx or out-of-range statuses', () => {
  assert.equal(clientSafeMessage(domainError('internal detail', 500), 'fallback'), 'fallback');
  assert.equal(clientSafeMessage(domainError('internal detail', 503), 'fallback'), 'fallback');
  assert.equal(clientSafeMessage(domainError('weird', 200), 'fallback'), 'fallback');
  assert.equal(clientSafeMessage(domainError('weird', NaN), 'fallback'), 'fallback');
});

test('clientSafeMessage falls back when a 4xx carries no message', () => {
  const error = new Error('');
  error.status = 400;
  assert.equal(clientSafeMessage(error, 'fallback'), 'fallback');
});

test('schoolScopeFilter confines everyone below level 5 to their own school', () => {
  for (const level of [1, 2, 3, 4]) {
    assert.deepEqual(
      schoolScopeFilter({ level, schoolName: 'PS 1' }),
      { schoolName: 'PS 1' },
      `level ${level} should be scoped`
    );
  }
});

test('schoolScopeFilter gives super admins the whole district', () => {
  assert.deepEqual(schoolScopeFilter({ level: 5, schoolName: 'PS 1' }), {});
});

test('schoolScopeFilter never degrades into an unscoped query', () => {
  // A missing level or school must not produce {}, which would return every school.
  assert.deepEqual(schoolScopeFilter({}), { schoolName: null });
  assert.deepEqual(schoolScopeFilter(null), { schoolName: null });
  assert.deepEqual(schoolScopeFilter({ level: 4 }), { schoolName: null });
});

test('schoolScopeFilter can target a different field', () => {
  assert.deepEqual(schoolScopeFilter({ level: 4, schoolName: 'PS 1' }, 'school'), { school: 'PS 1' });
});

test('bulkTargetFilter excludes the actor and lets Super Admin target any other account', () => {
  const actor = { _id: 'a1', level: 5, schoolName: 'PS 1' };
  const { ids, match } = bulkTargetFilter(actor, ['a1', 'b2', 'c3']);
  assert.deepEqual(ids, ['b2', 'c3'], 'the actor must not be able to bulk-act on themselves');
  assert.equal(match.level, undefined, 'super admins are not capped below their own level');
  assert.equal(match.schoolName, undefined, 'super admins are not school-scoped');
});

test('bulkTargetFilter confines non-super-admins to their school and level 3', () => {
  const actor = { _id: 'a1', level: 4, schoolName: 'PS 1' };
  const { match } = bulkTargetFilter(actor, ['b2']);
  assert.equal(match.schoolName, 'PS 1');
  assert.deepEqual(match.level, { $lte: 3 });
});
