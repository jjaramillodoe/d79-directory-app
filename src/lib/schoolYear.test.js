const test = require('node:test');
const assert = require('node:assert');

const {
  currentSchoolYear,
  inferSchoolYear,
  matchesSchoolYear,
  schoolYearQuery,
} = require('./schoolYear');

// The point of these tests is one property: pushing the school-year decision into the
// database must select exactly the forms the old `inferSchoolYear` JavaScript filter did.
// `matchesSchoolYear` is the rule the Mongo filter encodes, so proving it agrees with
// `inferSchoolYear` on every interesting shape of form is what makes the query trustworthy.

test('currentSchoolYear: the year turns over on July 1, in local time', () => {
  assert.equal(currentSchoolYear(new Date(2026, 5, 30)), '2025-2026', 'June 30 is the old year');
  assert.equal(currentSchoolYear(new Date(2026, 6, 1)), '2026-2027', 'July 1 is the new year');
  assert.equal(currentSchoolYear(new Date(2026, 11, 31)), '2026-2027');
  assert.equal(currentSchoolYear(new Date(2027, 0, 1)), '2026-2027', 'January stays put');
});

test('matchesSchoolYear agrees with inferSchoolYear across form shapes and years', () => {
  const now = currentSchoolYear();

  const forms = [
    { label: 'stored year', schoolYear: '2026-2027' },
    { label: 'stored other year', schoolYear: '2025-2026' },
    { label: 'stored year beats createdAt', schoolYear: '2026-2027', createdAt: new Date(2020, 0, 1) },
    { label: 'null year, mid-year createdAt', schoolYear: null, createdAt: new Date(2026, 9, 15) },
    { label: 'empty year, mid-year createdAt', schoolYear: '', createdAt: new Date(2026, 9, 15) },
    { label: 'absent year, mid-year createdAt', createdAt: new Date(2026, 9, 15) },
    { label: 'boundary: June 30', createdAt: new Date(2026, 5, 30, 23, 59, 59) },
    { label: 'boundary: July 1 00:00', createdAt: new Date(2026, 6, 1, 0, 0, 0) },
    { label: 'boundary: June 30 next cycle', createdAt: new Date(2027, 5, 30) },
    { label: 'createdAt as ISO string', createdAt: new Date(2026, 9, 15).toISOString() },
    { label: 'nothing at all' },
    { label: 'explicitly null createdAt', createdAt: null },
  ];

  const candidateYears = ['2024-2025', '2025-2026', '2026-2027', '2027-2028', now];

  for (const form of forms) {
    for (const year of candidateYears) {
      const expected = inferSchoolYear(form) === year;
      assert.equal(
        matchesSchoolYear(form, year),
        expected,
        `${form.label} vs ${year}: inferSchoolYear said ${inferSchoolYear(form)}`
      );
    }
  }
});

test('matchesSchoolYear: a form with no year and no createdAt belongs to the current year', () => {
  const now = currentSchoolYear();
  assert.equal(matchesSchoolYear({}, now), true);
  assert.equal(matchesSchoolYear({}, '1999-2000'), false);
});

test('schoolYearQuery: rejects anything that is not a well-formed year', () => {
  for (const bad of ['', null, undefined, 'all', '2026', '2026-27', 'abcd-efgh']) {
    assert.equal(schoolYearQuery(bad), null, `${JSON.stringify(bad)} should not build a filter`);
  }
});

test('schoolYearQuery: matches a stored year or a createdAt inside the July-to-July window', () => {
  const filter = schoolYearQuery('2026-2027');
  assert.ok(Array.isArray(filter.$or));

  const [stored, derived] = filter.$or;
  assert.deepEqual(stored, { schoolYear: '2026-2027' });

  // The window must be local July 1 to local July 1, matching currentSchoolYear's boundary.
  assert.deepEqual(derived.schoolYear, { $in: [null, ''] });
  assert.equal(derived.createdAt.$gte.getTime(), new Date(2026, 6, 1).getTime());
  assert.equal(derived.createdAt.$lt.getTime(), new Date(2027, 6, 1).getTime());
});

test('schoolYearQuery: only the current year also claims forms with no createdAt', () => {
  // Mirrors inferSchoolYear falling back to `new Date()` when createdAt is missing. Adding
  // this clause to a past year would wrongly pull in every dateless form.
  const now = currentSchoolYear();
  const currentFilter = schoolYearQuery(now);
  assert.equal(currentFilter.$or.length, 3);
  assert.deepEqual(currentFilter.$or[2], {
    schoolYear: { $in: [null, ''] },
    createdAt: { $in: [null, ''] },
  });

  const pastFilter = schoolYearQuery('1999-2000');
  assert.equal(pastFilter.$or.length, 2, 'a past year must not claim dateless forms');
});

test('schoolYearQuery: the $or branches are mutually consistent with matchesSchoolYear', () => {
  // Evaluates the filter's own clauses against sample forms, so the query structure is
  // checked rather than just the JavaScript twin. This is a stand-in for Mongo's matcher,
  // limited to the two operators the filter actually uses.
  const year = '2026-2027';
  const filter = schoolYearQuery(year);

  const clauseMatches = (clause, form) =>
    Object.entries(clause).every(([field, condition]) => {
      const value = form[field];
      if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
        if ('$in' in condition) {
          // Mongo treats a missing field as null for $in: [null, ...].
          return condition.$in.some((c) => (c === null ? value == null : value === c));
        }
        const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
        if ('$gte' in condition && !(time >= condition.$gte.getTime())) return false;
        if ('$lt' in condition && !(time < condition.$lt.getTime())) return false;
        return true;
      }
      return value === condition;
    });

  const samples = [
    { schoolYear: year },
    { schoolYear: '2025-2026' },
    { createdAt: new Date(2026, 9, 15) },
    { createdAt: new Date(2025, 9, 15) },
    { schoolYear: null, createdAt: new Date(2026, 6, 1) },
    { schoolYear: '', createdAt: new Date(2026, 5, 30) },
  ];

  for (const form of samples) {
    const viaFilter = filter.$or.some((clause) => clauseMatches(clause, form));
    assert.equal(
      viaFilter,
      matchesSchoolYear(form, year),
      `filter and predicate disagreed on ${JSON.stringify(form)}`
    );
  }
});
