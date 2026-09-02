const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseBankLabel,
  defaultAnswerForQuestion,
  assertBankSchema,
  emptyFormDataFromSteps,
  formIsEmpty,
  collectAnswers,
} = require('./populateFormFromBank');

const SAMPLE_STEPS = [
  {
    id: 2,
    key: 'childAbuseIntervention',
    title: 'Child Abuse',
    questions: [
      { id: 'q2', order: 1, type: 'textarea', required: true, title: 'Describe' },
      { id: 'q1', order: 0, type: 'checkbox', required: false, title: 'Confirm' },
    ],
  },
  {
    id: 1,
    key: 'tableOfContents',
    title: 'TOC',
    questions: [{ id: 'toc', order: 0, type: 'checkbox', title: 'Read' }],
  },
];

test('parseBankLabel reads the year and vN tag', () => {
  assert.deepEqual(parseBankLabel('2026-2027 Draft v23'), { schoolYear: '2026-2027', version: 23 });
  assert.deepEqual(parseBankLabel('last published v22'), { schoolYear: '', version: 22 });
  assert.deepEqual(parseBankLabel(''), { schoolYear: '', version: null });
});

test('defaultAnswerForQuestion matches type', () => {
  assert.equal(defaultAnswerForQuestion({ type: 'textarea' }), '');
  assert.equal(defaultAnswerForQuestion({ type: 'checkbox' }), false);
  const table = defaultAnswerForQuestion({
    type: 'table',
    columns: [{ header: 'Name', type: 'text' }, { header: 'Title', type: 'text' }],
  });
  assert.deepEqual(table.headers, ['Name', 'Title']);
  assert.equal(table.rows.length, 1);
  assert.equal(formIsEmpty({ step: { data: { q: table } } }), true);
});

test('assertBankSchema rejects missing keys and duplicate ids', () => {
  assert.throws(() => assertBankSchema([]), /no steps/);
  assert.throws(() => assertBankSchema([{ id: 1, questions: [{ id: 'q' }] }]), /missing a key/);
  assert.throws(
    () =>
      assertBankSchema([
        { key: 'a', questions: [{ id: 'q' }] },
        { key: 'a', questions: [{ id: 'q2' }] },
      ]),
    /duplicate step key/
  );
});

test('emptyFormDataFromSteps preserves question order from `order`', () => {
  const formData = emptyFormDataFromSteps(SAMPLE_STEPS);
  assert.deepEqual(Object.keys(formData), ['childAbuseIntervention', 'tableOfContents']);
  assert.deepEqual(Object.keys(formData.childAbuseIntervention.data), ['q1', 'q2']);
  assert.equal(formData.childAbuseIntervention.data.q1, false);
  assert.equal(formData.childAbuseIntervention.data.q2, '');
});

test('formIsEmpty ignores empty shells and empty tables', () => {
  assert.equal(formIsEmpty({}), true);
  assert.equal(
    formIsEmpty({
      tableOfContents: { completed: false, timeSpent: 0, revisionCount: 0 },
    }),
    true
  );
  const seeded = emptyFormDataFromSteps(SAMPLE_STEPS);
  assert.equal(formIsEmpty(seeded), true);
  seeded.childAbuseIntervention.data.q2 = 'filled';
  assert.equal(formIsEmpty(seeded), false);
  assert.deepEqual(collectAnswers(seeded), [{ stepKey: 'childAbuseIntervention', questionId: 'q2' }]);
});
