const test = require('node:test');
const assert = require('node:assert/strict');
const { splitLinkifiedText, normalizeHref } = require('./linkifyText');

test('pasted https URLs become a single link part', () => {
  const title = [
    'School counseling program Mission and Vision. The school\'s counseling program mission and vision statement',
    'communicates what the school hopes to see for students five to fifteen years in the future. It aligns to the school\'s and',
    'DOE\'s vision statement and is informed by the school counseling program\'s beliefs. For additional resources on how to',
    'draft school\'s counseling vision and mission statement, see "The ASCA National Model: A Framework for School',
    'Counseling Programs" at https://www.schoolcounselor.org/',
    'Our counseling program aims to make our graduates into problem solving, critical thinking young adults who can be',
    'successful contributors to society.',
  ].join('\n');

  const parts = splitLinkifiedText(title);
  const link = parts.find((part) => part.type === 'url');
  assert.equal(link.text, 'https://www.schoolcounselor.org/');
  assert.equal(link.href, 'https://www.schoolcounselor.org/');
  assert.equal(parts.some((part) => part.text.includes('ASCA National Model')), true);
});

test('www URLs get an https href and trailing punctuation stays outside the link', () => {
  const parts = splitLinkifiedText('See www.schoolcounselor.org.');
  assert.deepEqual(parts, [
    { type: 'text', text: 'See ' },
    { type: 'url', text: 'www.schoolcounselor.org', href: 'https://www.schoolcounselor.org/' },
    { type: 'text', text: '.' },
  ]);
});

test('javascript URLs are not linked', () => {
  assert.equal(normalizeHref('javascript:alert(1)'), '');
  assert.deepEqual(splitLinkifiedText('javascript:alert(1)'), [
    { type: 'text', text: 'javascript:alert(1)' },
  ]);
});
