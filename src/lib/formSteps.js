const FALLBACK_STEP_KEYS = [
  'tableOfContents',
  'childAbuseIntervention',
  'sexualHarassment',
  'respectForAll',
  'suicidePrevention',
  'attendancePlan',
  'temporaryHousing',
  'serviceInSchools',
  'planningInterviews',
  'militaryRecruitment',
  'schoolCulture',
  'afterSchoolPrograms',
  'cellPhonePolicy',
  'counselingPlan',
];

function getStepKeys(steps) {
  if (steps?.length) return steps.map((step) => step.key);
  return FALLBACK_STEP_KEYS;
}

function getStepKeyByNumber(steps, stepNumber) {
  const index = parseInt(stepNumber, 10) - 1;
  if (Number.isNaN(index) || index < 0) return null;
  const keys = getStepKeys(steps);
  return keys[index] || null;
}

function getStepNumberByKey(steps, stepKey) {
  if (!stepKey) return null;
  const keys = getStepKeys(steps);
  const index = keys.indexOf(stepKey);
  return index >= 0 ? index + 1 : null;
}

function completedStepNumbers(formData, steps) {
  return Object.keys(formData || {})
    .filter((key) => formData[key]?.completed)
    .map((key) => getStepNumberByKey(steps, key))
    .filter((value) => typeof value === 'number')
    .sort((a, b) => a - b);
}

module.exports = {
  FALLBACK_STEP_KEYS,
  getStepKeys,
  getStepKeyByNumber,
  getStepNumberByKey,
  completedStepNumbers,
};
