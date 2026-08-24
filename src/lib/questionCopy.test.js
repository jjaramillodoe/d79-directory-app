const test = require('node:test');
const assert = require('node:assert/strict');
const { splitQuestionCopy, withNoteEmphasis } = require('./questionCopy');
const { splitFormattedText } = require('./linkifyText');

test('short first sentence becomes the heading and the rest is instructions', () => {
  const title =
    'School counseling program Mission and Vision. The school\'s counseling program mission and vision statement communicates what the school hopes to see for students five to fifteen years in the future. See https://www.schoolcounselor.org/ for resources.';
  const copy = splitQuestionCopy(title, 'Provide clear Mission and Vision statements.');
  assert.equal(copy.heading, 'School counseling program Mission and Vision.');
  assert.equal(copy.body.includes('five to fifteen years'), true);
  assert.equal(copy.helper, 'Provide clear Mission and Vision statements.');
});

test('long legal titles stay as body text instead of a giant heading', () => {
  const title =
    'NYSED state law requires certified school counselor(s) design and develop the school\'s counseling program in collaboration with school teaching staff, student service, and other pupil personnel service providers. Provide the name and title of your school\'s counseling plan coordinator.';
  const copy = splitQuestionCopy(title, 'Include the designated coordinator’s name.');
  assert.equal(copy.heading, '');
  assert.equal(copy.body.startsWith('NYSED state law'), true);
  assert.equal(copy.helper.includes('coordinator'), true);
});

test('a line break after a short heading splits even without a period', () => {
  const copy = splitQuestionCopy(
    'School Counseling Activity\nDirect Student Services: Individual and small-group counseling.',
    ''
  );
  assert.equal(copy.heading, 'School Counseling Activity');
  assert.equal(copy.body.startsWith('Direct Student Services'), true);
});

test('Please Note is wrapped for bold and **text** formats', () => {
  const emphasized = withNoteEmphasis('Please Note: School leaders are advised to delegate roles.');
  assert.equal(emphasized.startsWith('**Please Note:**'), true);
  const parts = splitFormattedText('See **Please Note:** and https://www.schoolcounselor.org/');
  assert.equal(parts.some((part) => part.bold && part.text === 'Please Note:'), true);
  assert.equal(parts.some((part) => part.type === 'url'), true);
});
