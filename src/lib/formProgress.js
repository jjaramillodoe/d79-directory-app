const TOTAL_STEPS = 14;

function completedStepCount(form) {
  const flags = form?.stepCompletion;
  if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
    const fromFlags = Object.values(flags).filter(Boolean).length;
    if (fromFlags > 0) return fromFlags;
  }
  return Array.isArray(form?.completedSteps) ? form.completedSteps.length : 0;
}

function stepProgressPercent(form, total = TOTAL_STEPS) {
  const completed = completedStepCount(form);
  const denom = total || TOTAL_STEPS;
  return Math.round((completed / denom) * 100);
}

module.exports = {
  TOTAL_STEPS,
  completedStepCount,
  stepProgressPercent,
};
