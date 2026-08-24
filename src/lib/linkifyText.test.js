const test = require('node:test');
const assert = require('node:assert/strict');
const {
  splitLinkifiedText,
  splitFormattedText,
  normalizeHref,
  wrapSelectionAsBold,
  wrapSelectionAsLink,
} = require('./linkifyText');

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

test('markdown links use the selected phrase as the label', () => {
  const title =
    "See [NYSED Commissioner's Regulation 100.2(j)](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-100.2) for requirements.";
  const parts = splitFormattedText(title);
  const link = parts.find((part) => part.type === 'url');
  assert.equal(link.text, "NYSED Commissioner's Regulation 100.2(j)");
  assert.equal(link.href, 'https://www.law.cornell.edu/regulations/new-york/8-NYCRR-100.2');
  assert.equal(parts[0].text, 'See ');
  assert.equal(parts.at(-1).text, ' for requirements.');
});

test('unsafe markdown hrefs stay as plain text', () => {
  const parts = splitFormattedText('[click me](javascript:alert(1))');
  assert.equal(parts.some((part) => part.type === 'url'), false);
  assert.equal(parts.map((part) => part.text).join(''), '[click me](javascript:alert(1))');
});

test('wrapSelectionAsLink turns highlighted text into a markdown link', () => {
  const source = "See NYSED Commissioner's Regulation 100.2(j) for requirements.";
  const start = source.indexOf('NYSED');
  const end = source.indexOf(' for');
  const result = wrapSelectionAsLink(
    source,
    start,
    end,
    'https://www.law.cornell.edu/regulations/new-york/8-NYCRR-100.2'
  );
  assert.equal(
    result.text,
    "See [NYSED Commissioner's Regulation 100.2(j)](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-100.2) for requirements."
  );
});

test('wrapSelectionAsBold wraps the highlighted phrase', () => {
  const result = wrapSelectionAsBold('Please Note: keep this short.', 0, 12);
  assert.equal(result.text, '**Please Note:** keep this short.');
});
