const test = require('node:test');
const assert = require('node:assert');

const { TOTAL_STEPS, completedStepCount, stepProgressPercent } = require('./formProgress');

// Two representations of progress coexist on a form: the newer `stepCompletion` map and the
// older `completedSteps` array. These tests pin how the two interact, since that precedence
// is the only non-obvious thing in the module and it drives every percentage users see.

test('completedStepCount: absent or malformed forms count zero', () => {
  assert.equal(completedStepCount(undefined), 0);
  assert.equal(completedStepCount(null), 0);
  assert.equal(completedStepCount({}), 0);
});

test('completedStepCount: counts truthy entries in the stepCompletion map', () => {
  const form = { stepCompletion: { step1: true, step2: true, step3: false, step4: null } };
  assert.equal(completedStepCount(form), 2);
});

test('completedStepCount: falls back to completedSteps when stepCompletion is absent', () => {
  assert.equal(completedStepCount({ completedSteps: [1, 2, 3] }), 3);
  assert.equal(completedStepCount({ completedSteps: [] }), 0);
});

test('completedStepCount: an all-false stepCompletion map falls through to the array', () => {
  // The `fromFlags > 0` guard means a map of all-false does not short-circuit. That matters
  // for partially migrated forms that carry a zeroed map alongside a real legacy array —
  // reading the map alone would report zero progress on a form that has some.
  const form = {
    stepCompletion: { step1: false, step2: false },
    completedSteps: [1, 2, 3, 4],
  };
  assert.equal(completedStepCount(form), 4);
});

test('completedStepCount: a populated stepCompletion map wins over the legacy array', () => {
  const form = {
    stepCompletion: { step1: true, step2: true },
    completedSteps: [1, 2, 3, 4, 5, 6],
  };
  assert.equal(completedStepCount(form), 2);
});

test('completedStepCount: an array-valued stepCompletion is rejected, not counted', () => {
  // `typeof [] === 'object'`, so without the Array.isArray guard an array here would be
  // counted by Object.values and silently outrank completedSteps.
  const form = { stepCompletion: [true, true, true], completedSteps: [1] };
  assert.equal(completedStepCount(form), 1);
});

test('completedStepCount: a non-array completedSteps is not counted', () => {
  assert.equal(completedStepCount({ completedSteps: 5 }), 0);
  assert.equal(completedStepCount({ completedSteps: 'three' }), 0);
});

test('stepProgressPercent: rounds against the default total', () => {
  assert.equal(TOTAL_STEPS, 14);
  assert.equal(stepProgressPercent({ completedSteps: [] }), 0);
  assert.equal(stepProgressPercent({ completedSteps: new Array(14).fill(1) }), 100);
  // 7/14 is exactly half; 1/14 rounds 7.14 down to 7.
  assert.equal(stepProgressPercent({ completedSteps: new Array(7).fill(1) }), 50);
  assert.equal(stepProgressPercent({ completedSteps: [1] }), 7);
});

test('stepProgressPercent: an explicit total overrides the default', () => {
  assert.equal(stepProgressPercent({ completedSteps: [1, 2] }, 4), 50);
});

test('stepProgressPercent: a zero or missing total falls back rather than dividing by zero', () => {
  // Without the `total || TOTAL_STEPS` fallback this would be Infinity, which would render
  // as a nonsense percentage rather than failing visibly.
  assert.equal(stepProgressPercent({ completedSteps: [1] }, 0), 7);
  assert.equal(stepProgressPercent({ completedSteps: [1] }, undefined), 7);
});

test('stepProgressPercent: progress beyond the total is not clamped', () => {
  // Documenting current behavior rather than endorsing it: a form carrying more completed
  // steps than the total reports over 100%. Worth clamping if it ever shows up in the UI.
  assert.equal(stepProgressPercent({ completedSteps: new Array(20).fill(1) }), 143);
});
