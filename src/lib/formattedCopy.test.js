const test = require('node:test');
const assert = require('node:assert/strict');
const { splitCopyBlocks } = require('./formattedCopy');

test('blank copy becomes no blocks', () => {
  assert.deepEqual(splitCopyBlocks(''), []);
  assert.deepEqual(splitCopyBlocks('   \n\n  '), []);
});

test('paragraphs split on blank lines', () => {
  const blocks = splitCopyBlocks('First paragraph.\n\nSecond paragraph.');
  assert.deepEqual(blocks, [
    { type: 'p', text: 'First paragraph.' },
    { type: 'p', text: 'Second paragraph.' },
  ]);
});

test('bullet and numbered lists are detected next to a heading line', () => {
  const blocks = splitCopyBlocks(
    [
      'The RFA plan must include:',
      '- Programs that promote respectful behavior',
      '- Specific interventions for greater support',
      '',
      '1. Educational performance',
      '2. Mental or emotional wellbeing',
    ].join('\n')
  );
  assert.deepEqual(blocks, [
    { type: 'p', text: 'The RFA plan must include:' },
    {
      type: 'ul',
      items: [
        'Programs that promote respectful behavior',
        'Specific interventions for greater support',
      ],
    },
    {
      type: 'ol',
      items: ['Educational performance', 'Mental or emotional wellbeing'],
    },
  ]);
});
