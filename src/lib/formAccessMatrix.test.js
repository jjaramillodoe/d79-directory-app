// Exhaustive authorization matrix for the form routes.
//
// The unit tests in formAccess.test.js check individual rules. This file instead pins
// down the whole policy as one readable table, so that any change to formAccess.js
// surfaces as a specific failing cell rather than a vague regression. Every combination
// of {level 1-5} x {owner, not owner} x {same school, other school} is listed explicitly;
// the suite fails if a combination is missing or duplicated.
const test = require('node:test');
const assert = require('node:assert/strict');
const { describeFormAccess } = require('./formAccess');

const FORM_ID = '650000000000000000000001';
const OWNER_ID = '650000000000000000000002';
const OTHER_ID = '650000000000000000000003';

const FORM_SCHOOL = 'School A';
const OTHER_SCHOOL = 'School B';

function form(overrides = {}) {
  return {
    _id: FORM_ID,
    userId: OWNER_ID,
    schoolName: FORM_SCHOOL,
    // Deliberately not any test user's address, so the principalEmail grant only fires
    // in the test that targets it.
    principalEmail: 'principal@schools.nyc.gov',
    sharedWithEmails: [],
    ...overrides,
  };
}

function user({ level, owner, sameSchool, ...overrides }) {
  return {
    _id: owner ? OWNER_ID : OTHER_ID,
    email: 'user@schools.nyc.gov',
    level,
    schoolName: sameSchool ? FORM_SCHOOL : OTHER_SCHOOL,
    assignedForms: [],
    ...overrides,
  };
}

// view/edit are the expected results. `why` documents the grant that should produce them.
const MATRIX = [
  // Ownership beats everything else, at every level.
  { level: 1, owner: true, sameSchool: true, view: true, edit: true, why: 'owner' },
  { level: 1, owner: true, sameSchool: false, view: true, edit: true, why: 'owner' },
  { level: 2, owner: true, sameSchool: true, view: true, edit: true, why: 'owner' },
  { level: 2, owner: true, sameSchool: false, view: true, edit: true, why: 'owner' },
  { level: 3, owner: true, sameSchool: true, view: true, edit: true, why: 'owner' },
  { level: 3, owner: true, sameSchool: false, view: true, edit: true, why: 'owner' },
  { level: 4, owner: true, sameSchool: true, view: true, edit: true, why: 'owner' },
  { level: 4, owner: true, sameSchool: false, view: true, edit: true, why: 'owner' },
  { level: 5, owner: true, sameSchool: true, view: true, edit: true, why: 'owner' },
  { level: 5, owner: true, sameSchool: false, view: true, edit: true, why: 'owner' },

  // Level 1 has no school-wide grant: a viewer must be assigned or shared in.
  { level: 1, owner: false, sameSchool: true, view: false, edit: false, why: null },
  { level: 1, owner: false, sameSchool: false, view: false, edit: false, why: null },

  // Levels 2-4 edit their own school's plan, because there is exactly one plan per
  // school per year, and nothing at any other school.
  { level: 2, owner: false, sameSchool: true, view: true, edit: true, why: 'sameSchool' },
  { level: 2, owner: false, sameSchool: false, view: false, edit: false, why: null },
  { level: 3, owner: false, sameSchool: true, view: true, edit: true, why: 'sameSchool' },
  { level: 3, owner: false, sameSchool: false, view: false, edit: false, why: null },
  { level: 4, owner: false, sameSchool: true, view: true, edit: true, why: 'sameSchool' },
  { level: 4, owner: false, sameSchool: false, view: false, edit: false, why: null },

  // Super Admins reach every school.
  { level: 5, owner: false, sameSchool: true, view: true, edit: true, why: 'superAdmin' },
  { level: 5, owner: false, sameSchool: false, view: true, edit: true, why: 'superAdmin' },
];

test('matrix covers every level/owner/school combination exactly once', () => {
  const seen = new Set();
  for (const row of MATRIX) {
    const key = `${row.level}:${row.owner}:${row.sameSchool}`;
    assert.equal(seen.has(key), false, `duplicate matrix row for ${key}`);
    seen.add(key);
  }
  assert.equal(seen.size, 5 * 2 * 2, 'matrix must cover 5 levels x owner x school');
});

for (const row of MATRIX) {
  const label = `level ${row.level} / ${row.owner ? 'owner' : 'not owner'} / ${
    row.sameSchool ? 'same school' : 'other school'
  }`;

  test(`matrix: ${label}`, () => {
    const access = describeFormAccess(user(row), form());
    assert.equal(access.canView, row.view, `${label}: canView`);
    assert.equal(access.canEdit, row.edit, `${label}: canEdit`);
    if (row.why) {
      assert.equal(access.grant, row.why, `${label}: grant`);
    } else {
      assert.equal(access.grant, null, `${label}: expected no grant`);
    }
  });
}

// The overlays below are the only ways a user with no level/school grant gets in, and
// the only ways a user can end up with view access but not edit.

test('matrix overlay: assignment across all levels, stored permission "view"', () => {
  // An assigned Assistant Principal is the documented exception: they always edit.
  const expected = {
    1: { view: true, edit: false },
    2: { view: true, edit: false },
    3: { view: true, edit: true },
    4: { view: true, edit: false },
    5: { view: true, edit: true }, // super admin grant wins before assignment is consulted
  };

  for (const level of [1, 2, 3, 4, 5]) {
    const subject = user({
      level,
      owner: false,
      sameSchool: false,
      assignedForms: [{ formId: FORM_ID, permissions: 'view' }],
    });
    const access = describeFormAccess(subject, form());
    assert.equal(access.canView, expected[level].view, `level ${level} assigned-view canView`);
    assert.equal(access.canEdit, expected[level].edit, `level ${level} assigned-view canEdit`);
  }
});

test('matrix overlay: assignment with stored permission "edit" grants edit at every level', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    const subject = user({
      level,
      owner: false,
      sameSchool: false,
      assignedForms: [{ formId: FORM_ID, permissions: 'edit' }],
    });
    assert.equal(describeFormAccess(subject, form()).canEdit, true, `level ${level} assigned-edit`);
  }
});

test('matrix overlay: email share honours its own permission', () => {
  for (const level of [1, 2, 3, 4]) {
    const subject = user({ level, owner: false, sameSchool: false, email: 'guest@schools.nyc.gov' });

    const viewShared = form({
      sharedWithEmails: [{ email: 'guest@schools.nyc.gov', permissions: 'view' }],
    });
    const viewAccess = describeFormAccess(subject, viewShared);
    assert.equal(viewAccess.canView, true, `level ${level} share-view canView`);
    assert.equal(viewAccess.canEdit, false, `level ${level} share-view canEdit`);

    const editShared = form({
      sharedWithEmails: [{ email: 'guest@schools.nyc.gov', permissions: 'edit' }],
    });
    assert.equal(
      describeFormAccess(subject, editShared).canEdit,
      true,
      `level ${level} share-edit canEdit`
    );
  }
});

test('matrix overlay: principalEmail grants access from any school at any level', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    const subject = user({
      level,
      owner: false,
      sameSchool: false,
      email: 'principal@schools.nyc.gov',
    });
    const access = describeFormAccess(subject, form());
    assert.equal(access.canEdit, true, `level ${level} principalEmail canEdit`);
  }
});

test('a cross-school assignment to a different form never grants access', () => {
  for (const level of [1, 2, 3, 4]) {
    const subject = user({
      level,
      owner: false,
      sameSchool: false,
      assignedForms: [{ formId: '650000000000000000000099', permissions: 'edit' }],
    });
    assert.equal(describeFormAccess(subject, form()).canView, false, `level ${level}`);
  }
});
