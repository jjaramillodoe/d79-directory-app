const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeYesNo,
  formatYesNo,
  isGateQuestion,
  isQuestionVisible,
  visibleQuestions,
  questionsForDisplay,
  hasMeaningfulAnswer,
  sanitizeQuestionUpdates,
  sanitizeStepUpdates,
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

test('counseling checkbox hides the following table until it is checked', () => {
  const counseling = [
    {
      id: 'offer',
      question_number: '3',
      type: 'checkbox',
      title: 'Does your school offer a comprehensive School Counseling Activity?',
      required: true,
      order: 0,
    },
    {
      id: 'programs',
      question_number: '3a',
      type: 'table',
      title: 'Does your school offer a comprehensive School Counseling Activity?',
      required: false,
      order: 1,
    },
  ];

  assert.equal(isGateQuestion(counseling[0]), true);
  assert.equal(isGateQuestion(counseling[1]), false);
  assert.equal(isQuestionVisible(counseling[1], counseling, {}), false);
  assert.equal(isQuestionVisible(counseling[1], counseling, { offer: false }), false);
  assert.equal(isQuestionVisible(counseling[1], counseling, { offer: true }), true);
  assert.equal(isQuestionVisible(counseling[1], counseling, { offer: 'yes' }), true);
});

test('yesno counseling title also hides later questions without gatesFollowing', () => {
  const counseling = [
    {
      id: 'offer',
      question_number: '3',
      type: 'yesno',
      title: 'Does your school offer a comprehensive School Counseling Activity?',
      required: true,
      order: 0,
    },
    {
      id: 'programs',
      question_number: '3a',
      type: 'table',
      title: 'Does your school offer a comprehensive School Counseling Activity?',
      required: false,
      order: 1,
    },
  ];

  assert.equal(isQuestionVisible(counseling[1], counseling, {}), false);
  assert.equal(isQuestionVisible(counseling[1], counseling, { offer: 'no' }), false);
  assert.equal(isQuestionVisible(counseling[1], counseling, { offer: false }), false);
  assert.equal(isQuestionVisible(counseling[1], counseling, { offer: 'yes' }), true);
});

test('sanitize keeps gatesFollowing on checkbox questions', () => {
  const kept = sanitizeQuestionUpdates({ type: 'checkbox', gatesFollowing: true });
  assert.equal(kept.gatesFollowing, true);
  const cleared = sanitizeQuestionUpdates({ type: 'textarea', gatesFollowing: true });
  assert.equal(cleared.gatesFollowing, false);
});

test('sanitizeStepUpdates keeps intro text and a non-empty title', () => {
  const kept = sanitizeStepUpdates({
    title: '  Respect For All Plan  ',
    intro: '**Required.** See [A-832](https://www.schools.nyc.gov/).',
  });
  assert.equal(kept.title, 'Respect For All Plan');
  assert.equal(kept.intro.includes('A-832'), true);
  const emptyTitle = sanitizeStepUpdates({ title: '   ', intro: '' });
  assert.equal(Object.prototype.hasOwnProperty.call(emptyTitle, 'title'), false);
  assert.equal(emptyTitle.intro, '');
});
