function currentSchoolYear(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = value.getMonth();
  const start = month >= 6 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function previousSchoolYear(schoolYear) {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const start = Number(match[1]) - 1;
    return `${start}-${start + 1}`;
  }
  const current = currentSchoolYear();
  const start = Number(current.slice(0, 4)) - 1;
  return `${start}-${start + 1}`;
}

function nextSchoolYear(schoolYear) {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const start = Number(match[1]) + 1;
    return `${start}-${start + 1}`;
  }
  const current = currentSchoolYear();
  const start = Number(current.slice(0, 4)) + 1;
  return `${start}-${start + 1}`;
}

function inferSchoolYear(form) {
  if (form?.schoolYear) return form.schoolYear;
  return currentSchoolYear(form?.createdAt || new Date());
}

function isValidSchoolYear(value) {
  return /^\d{4}-\d{4}$/.test(String(value || ''));
}

function latestSchoolYear(years = []) {
  const valid = [...new Set((years || []).filter(isValidSchoolYear))].sort();
  return valid[valid.length - 1] || currentSchoolYear();
}

function schoolYearTerm(schoolYear) {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const startYear = match[1];
  const endYear = match[2];
  return {
    start: `${startYear}-07-01`,
    end: `${endYear}-06-30`,
    startLabel: `July 1, ${startYear}`,
    endLabel: `June 30, ${endYear}`,
  };
}

module.exports = {
  currentSchoolYear,
  previousSchoolYear,
  nextSchoolYear,
  inferSchoolYear,
  isValidSchoolYear,
  latestSchoolYear,
  schoolYearTerm,
};
