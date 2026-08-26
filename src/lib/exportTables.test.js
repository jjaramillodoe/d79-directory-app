const test = require('node:test');
const assert = require('node:assert');

const { resolveExportAnswer, ANSWER_PLACEHOLDER } = require('./exportTables');

// resolveExportAnswer was lifted out of duplicate copies in the PDF and DOCX export routes.
// These cases pin the behavior those copies had, so the two formats cannot drift apart again.

test('resolveExportAnswer: plain text answers pass through trimmed of nothing', () => {
  const { table, hasData, displayValue } = resolveExportAnswer(
    { id: 'q1', type: 'textarea' },
    'We will expand tutoring.'
  );
  assert.equal(table, null);
  assert.equal(hasData, true);
  assert.equal(displayValue, 'We will expand tutoring.');
});

test('resolveExportAnswer: unanswered questions render the ruled placeholder', () => {
  for (const value of [undefined, null, '']) {
    const { hasData, displayValue } = resolveExportAnswer({ id: 'q1', type: 'text' }, value);
    assert.equal(hasData, false, `expected no data for ${JSON.stringify(value)}`);
    assert.equal(displayValue, ANSWER_PLACEHOLDER);
  }
});

test('resolveExportAnswer: yesno and checkbox answers normalize to Yes/No', () => {
  for (const type of ['yesno', 'checkbox']) {
    assert.equal(resolveExportAnswer({ id: 'q', type }, true).displayValue, 'Yes');
    assert.equal(resolveExportAnswer({ id: 'q', type }, 'yes').displayValue, 'Yes');
    assert.equal(resolveExportAnswer({ id: 'q', type }, false).displayValue, 'No');
    assert.equal(resolveExportAnswer({ id: 'q', type }, 'no').displayValue, 'No');
  }
});

test('resolveExportAnswer: a false checkbox still counts as answered', () => {
  // The generic emptiness check would treat `false` as data, but the choice branch runs
  // formatYesNo instead, and 'No' is a real answer rather than a blank to be ruled off.
  const { hasData, displayValue } = resolveExportAnswer({ id: 'q', type: 'yesno' }, false);
  assert.equal(hasData, true);
  assert.equal(displayValue, 'No');
});

test('resolveExportAnswer: an unrecognized choice value is treated as unanswered', () => {
  const { hasData, displayValue } = resolveExportAnswer({ id: 'q', type: 'yesno' }, 'maybe');
  assert.equal(hasData, false);
  assert.equal(displayValue, ANSWER_PLACEHOLDER);
});

test('resolveExportAnswer: arrays join with commas, objects print as indented JSON', () => {
  assert.equal(
    resolveExportAnswer({ id: 'q', type: 'select' }, ['Math', 'ELA']).displayValue,
    'Math, ELA'
  );
  assert.equal(
    resolveExportAnswer({ id: 'q', type: 'text' }, { a: 1 }).displayValue,
    JSON.stringify({ a: 1 }, null, 2)
  );
});

test('resolveExportAnswer: maxLength truncates only when asked', () => {
  const long = 'x'.repeat(6000);
  const truncated = resolveExportAnswer({ id: 'q', type: 'textarea' }, long, { maxLength: 5000 });
  assert.equal(truncated.displayValue.length, 5000 + '... (truncated)'.length);
  assert.ok(truncated.displayValue.endsWith('... (truncated)'));

  // The DOCX route passes no maxLength, so it must keep the whole answer.
  const untouched = resolveExportAnswer({ id: 'q', type: 'textarea' }, long);
  assert.equal(untouched.displayValue, long);
});

test('resolveExportAnswer: table questions return a table and no placeholder text', () => {
  const { table, hasData, displayValue } = resolveExportAnswer(
    { id: 'q', type: 'table' },
    { headers: ['Goal'], rows: [['Raise attendance']] }
  );
  assert.ok(table, 'expected a resolved table');
  assert.equal(hasData, true);
  assert.equal(displayValue, '', 'table answers must not get the ruled placeholder');
});

test('resolveExportAnswer: an empty table is unanswered but still resolves a grid', () => {
  const { table, hasData, displayValue } = resolveExportAnswer(
    { id: 'q', type: 'table' },
    { headers: ['Goal'], rows: [['']] }
  );
  // `always: true` for table questions means the blank grid still prints for someone
  // filling the plan in by hand, so displayValue stays empty rather than becoming a rule.
  assert.ok(table);
  assert.equal(hasData, false);
  assert.equal(displayValue, '');
});
