function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeIncomingData(stepData, dirty) {
  if (dirty && typeof dirty === 'object' && !Array.isArray(dirty)) {
    return dirty;
  }
  if (!stepData || typeof stepData !== 'object' || Array.isArray(stepData)) {
    return {};
  }
  if (stepData.data && typeof stepData.data === 'object' && !Array.isArray(stepData.data)) {
    return stepData.data;
  }
  return stepData;
}

function diffDirtyFields(incoming, serverData) {
  const dirty = {};
  Object.keys(incoming || {}).forEach((key) => {
    if (!valuesEqual(incoming[key], serverData?.[key])) {
      dirty[key] = incoming[key];
    }
  });
  return dirty;
}

function buildCompletedSteps(formData, steps) {
  const { getStepNumberByKey } = require('./formSteps');
  return Object.keys(formData || {})
    .filter((key) => formData[key]?.completed)
    .map((key) => getStepNumberByKey(steps, key))
    .filter((stepNumber) => typeof stepNumber === 'number')
    .sort((a, b) => a - b);
}

module.exports = {
  valuesEqual,
  normalizeIncomingData,
  diffDirtyFields,
  buildCompletedSteps,
};
