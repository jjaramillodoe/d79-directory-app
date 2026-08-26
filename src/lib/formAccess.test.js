const test = require('node:test');
const assert = require('node:assert/strict');
const { describeFormAccess, canViewForm, canEditForm } = require('./formAccess');

const FORM_ID = '650000000000000000000001';
const OWNER_ID = '650000000000000000000002';
const OTHER_ID = '650000000000000000000003';

function makeForm(overrides = {}) {
  return {
    _id: FORM_ID,
    userId: OWNER_ID,
    schoolName: 'School A',
    principalEmail: 'principal@schools.nyc.gov',
    sharedWithEmails: [],
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    _id: OTHER_ID,
    email: 'user@schools.nyc.gov',
    level: 1,
    schoolName: 'School A',
    assignedForms: [],
    ...overrides,
  };
}

test('denies access when user or form is missing', () => {
  assert.equal(canViewForm(null, makeForm()), false);
  assert.equal(canEditForm(makeUser(), null), false);
});

test('owner gets owner permission', () => {
  const access = describeFormAccess(makeUser({ _id: OWNER_ID }), makeForm());
  assert.equal(access.permission, 'owner');
  assert.equal(access.grant, 'owner');
  assert.equal(access.canEdit, true);
});

test('owner match works when userId is populated', () => {
  const form = makeForm({ userId: { _id: OWNER_ID, name: 'Owner' } });
  assert.equal(canEditForm(makeUser({ _id: OWNER_ID }), form), true);
});

test('principal is matched by email regardless of case', () => {
  const user = makeUser({ email: 'Principal@Schools.NYC.gov', level: 4, schoolName: 'School Z' });
  const access = describeFormAccess(user, makeForm());
  assert.equal(access.grant, 'principalEmail');
  assert.equal(access.canEdit, true);
});

test('super admin can edit a form from any school', () => {
  const user = makeUser({ level: 5, schoolName: 'School Z' });
  const access = describeFormAccess(user, makeForm());
  assert.equal(access.grant, 'superAdmin');
  assert.equal(access.canEdit, true);
});

test('levels 2, 3 and 4 can edit their own school plan', () => {
  for (const level of [2, 3, 4]) {
    const access = describeFormAccess(makeUser({ level }), makeForm());
    assert.equal(access.canEdit, true, `level ${level} should edit`);
    assert.equal(access.grant, 'sameSchool', `level ${level} should match by school`);
  }
});

test('level 1 gets no school-wide grant', () => {
  const access = describeFormAccess(makeUser({ level: 1 }), makeForm());
  assert.equal(access.canView, false);
  assert.equal(access.canEdit, false);
});

test('levels 2-4 from another school are denied', () => {
  for (const level of [2, 3, 4]) {
    const user = makeUser({ level, schoolName: 'School B' });
    assert.equal(canViewForm(user, makeForm()), false, `level ${level} cross-school view`);
    assert.equal(canEditForm(user, makeForm()), false, `level ${level} cross-school edit`);
  }
});

test('missing school name never counts as a match', () => {
  assert.equal(canEditForm(makeUser({ level: 4, schoolName: null }), makeForm()), false);
  assert.equal(canEditForm(makeUser({ level: 4 }), makeForm({ schoolName: null })), false);
});

test('assigned level 3 from another school can edit even with view permission', () => {
  const user = makeUser({
    level: 3,
    schoolName: 'School B',
    assignedForms: [{ formId: FORM_ID, permissions: 'view' }],
  });
  const access = describeFormAccess(user, makeForm());
  assert.equal(access.grant, 'assignment');
  assert.equal(access.canEdit, true);
});

test('assignment permission is respected for non level 3 users', () => {
  const viewer = makeUser({
    level: 1,
    schoolName: 'School B',
    assignedForms: [{ formId: FORM_ID, permissions: 'view' }],
  });
  const viewerAccess = describeFormAccess(viewer, makeForm());
  assert.equal(viewerAccess.canView, true);
  assert.equal(viewerAccess.canEdit, false);
  assert.equal(viewerAccess.permission, 'view');

  const editor = makeUser({
    level: 1,
    schoolName: 'School B',
    assignedForms: [{ formId: FORM_ID, permissions: 'edit' }],
  });
  assert.equal(canEditForm(editor, makeForm()), true);
});

test('assignment for a different form does not grant access', () => {
  const user = makeUser({
    level: 1,
    schoolName: 'School B',
    assignedForms: [{ formId: '650000000000000000000099', permissions: 'edit' }],
  });
  assert.equal(canViewForm(user, makeForm()), false);
});

test('shared email grants view or edit according to permission', () => {
  const form = makeForm({
    sharedWithEmails: [{ email: 'guest@schools.nyc.gov', permissions: 'view' }],
  });
  const guest = makeUser({ level: 1, schoolName: 'School B', email: 'guest@schools.nyc.gov' });
  const access = describeFormAccess(guest, form);
  assert.equal(access.grant, 'share');
  assert.equal(access.canView, true);
  assert.equal(access.canEdit, false);

  const editForm = makeForm({
    sharedWithEmails: [{ email: 'guest@schools.nyc.gov', permissions: 'edit' }],
  });
  assert.equal(canEditForm(guest, editForm), true);
});

test('school grant takes precedence over a weaker share entry', () => {
  const form = makeForm({
    sharedWithEmails: [{ email: 'user@schools.nyc.gov', permissions: 'view' }],
  });
  const access = describeFormAccess(makeUser({ level: 4 }), form);
  assert.equal(access.grant, 'sameSchool');
  assert.equal(access.canEdit, true);
});

test('tolerates forms and users with missing collections', () => {
  const form = { _id: FORM_ID, userId: OWNER_ID, schoolName: 'School A' };
  const user = { _id: OTHER_ID, email: 'user@schools.nyc.gov', level: 4, schoolName: 'School A' };
  assert.equal(canEditForm(user, form), true);
});
