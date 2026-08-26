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

/**
 * Mongo filter selecting the forms that `inferSchoolYear` would assign to `schoolYear`.
 *
 * Several admin routes were loading every form in the collection and then filtering with
 * `inferSchoolYear` in JavaScript, because the school year is only sometimes a stored field.
 * This pushes the same decision into the query.
 *
 * `inferSchoolYear` has two branches, so the filter does too:
 *
 *  - a stored, truthy `schoolYear` wins outright;
 *  - otherwise the year is derived from `createdAt` against a July 1 boundary.
 *
 * The boundary is expressed as a `createdAt` range built here in JavaScript rather than with
 * Mongo's `$year`/`$month`. That is deliberate. `currentSchoolYear` reads the month via
 * `Date#getMonth`, which is local time, while Mongo's date operators default to UTC — so for
 * a form created within a few hours of July 1 the two would disagree. Comparing against
 * `new Date(year, 6, 1)` keeps the boundary in exactly the same timezone as the function this
 * mirrors, whatever that timezone happens to be.
 *
 * Keep in step with `matchesSchoolYear` below, which is the same rule in JavaScript.
 */
function schoolYearQuery(schoolYear) {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const from = new Date(startYear, 6, 1);
  const to = new Date(startYear + 1, 6, 1);

  // `{ $in: [null, ''] }` covers stored null, stored empty string, and the field being
  // absent entirely, which is the set `inferSchoolYear` treats as falsy.
  const unset = { $in: [null, ''] };
  const derived = [{ schoolYear: unset, createdAt: { $gte: from, $lt: to } }];

  // A form with neither `schoolYear` nor `createdAt` is inferred from the clock, so it
  // belongs to whichever year is current.
  if (currentSchoolYear() === schoolYear) {
    derived.push({ schoolYear: unset, createdAt: unset });
  }

  return { $or: [{ schoolYear }, ...derived] };
}

/**
 * The JavaScript twin of `schoolYearQuery`, kept so the rule can be tested directly against
 * `inferSchoolYear` without a database.
 */
function matchesSchoolYear(form, schoolYear) {
  if (form?.schoolYear) return form.schoolYear === schoolYear;

  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return false;

  const startYear = Number(match[1]);
  if (!form?.createdAt) return currentSchoolYear() === schoolYear;

  const createdAt = form.createdAt instanceof Date ? form.createdAt : new Date(form.createdAt);
  return createdAt >= new Date(startYear, 6, 1) && createdAt < new Date(startYear + 1, 6, 1);
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
  schoolYearQuery,
  matchesSchoolYear,
  schoolYearTerm,
};
