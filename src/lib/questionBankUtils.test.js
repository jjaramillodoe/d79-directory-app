const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeYesNo,
  formatYesNo,
  isQuestionVisible,
  visibleQuestions,
  questionsForDisplay,
  hasMeaningfulAnswer,
} = require('./questionBankUtils');

const questions = [
  {
    id: 'offer',
    question_number: '1',
    type: 'yesno',
    required: true,
    gatesFollowing: true,
    order: 0,
  },
  {
    id: 'coordinator',
    question_number: '2',
    type: 'textarea',
    required: true,
    order: 1,
  },
  {
    id: 'mission',
    question_number: '3',
    type: 'textarea',
    required: true,
    order: 2,
  },
];

test('yes and no normalize from several input shapes', () => {
  assert.equal(normalizeYesNo('yes'), 'yes');
  assert.equal(normalizeYesNo('No'), 'no');
  assert.equal(normalizeYesNo(true), 'yes');
  assert.equal(formatYesNo('yes'), 'Yes');
  assert.equal(formatYesNo('no'), 'No');
  assert.equal(hasMeaningfulAnswer('no'), true);
});

test('later questions stay hidden until the gate is Yes', () => {
  assert.equal(isQuestionVisible(questions[1], questions, {}), false);
  assert.equal(isQuestionVisible(questions[1], questions, { offer: 'no' }), false);
  assert.equal(isQuestionVisible(questions[1], questions, { offer: 'yes' }), true);
  assert.equal(isQuestionVisible(questions[0], questions, { offer: 'no' }), true);
});

test('visibleQuestions only returns the gate when the answer is No', () => {
  const hidden = visibleQuestions(questions, { offer: 'no', coordinator: 'Kept on file' });
  assert.deepEqual(
    hidden.map((question) => question.id),
    ['offer']
  );
  const shown = visibleQuestions(questions, { offer: 'yes' });
  assert.deepEqual(
    shown.map((question) => question.id),
    ['offer', 'coordinator', 'mission']
  );
});

test('gated answers are not surfaced as orphan questions', () => {
  const display = questionsForDisplay(questions, { offer: 'no', coordinator: 'Kept on file' });
  assert.deepEqual(
    display.map((question) => question.id),
    ['offer']
  );
});
