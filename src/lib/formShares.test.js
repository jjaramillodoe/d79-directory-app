const test = require('node:test');
const assert = require('node:assert/strict');
const { buildShareList } = require('./formShares');

const form = {
  _id: 'f1',
  userId: 'owner',
  schoolName: 'School A',
  schoolYear: '2026-2027',
  status: 'draft',
  sharedWithEmails: [
    { email: 'Guest@Example.org', permissions: 'view', sharedAt: new Date('2026-10-01'), sharedBy: { name: 'Admin' } },
  ],
};

const assignment = (overrides = {}) => ({
  formId: 'f1',
  permissions: 'view',
  assignedAt: new Date('2026-09-01'),
  assignedBy: { name: 'Principal P' },
  ...overrides,
});

test('lists user assignments and email shares for a form', () => {
  const users = [
    { _id: 'u3', name: 'Ana AP', email: 'ana@x.gov', level: 3, schoolName: 'School A', assignedForms: [assignment()] },
  ];
  const [entry] = buildShareList([form], users, []);
  assert.equal(entry.formId, 'f1');
  assert.deepEqual(entry.people.map((p) => p.kind), ['user', 'email']);
  const ana = entry.people[0];
  assert.equal(ana.permissions, 'edit', 'Level 3 assignments always edit');
  assert.equal(ana.sharedBy, 'Principal P');
  assert.equal(entry.people[1].email, 'guest@example.org');
});

test('same-school staff keep access after their share is removed', () => {
  const users = [
    { _id: 'u3', name: 'Ana', email: 'ana@x.gov', level: 3, schoolName: 'School A', assignedForms: [assignment()] },
    { _id: 'u1', name: 'Vic', email: 'vic@x.gov', level: 1, schoolName: 'School A', assignedForms: [assignment()] },
    { _id: 'u9', name: 'Zed', email: 'zed@x.gov', level: 3, schoolName: 'School B', assignedForms: [assignment()] },
  ];
  const people = buildShareList([{ ...form, sharedWithEmails: [] }], users, [])[0].people;
  const byName = Object.fromEntries(people.map((p) => [p.name, p.retainsAccess]));
  assert.deepEqual(byName, { Ana: true, Vic: false, Zed: false });
});

test('an email share for a user with no other grant loses access', () => {
  const guest = { _id: 'g', name: 'Guest', email: 'guest@example.org', level: 1, schoolName: 'Other' };
  const emailEntry = buildShareList([form], [], [guest])[0].people[0];
  assert.equal(emailEntry.name, 'Guest');
  assert.equal(emailEntry.retainsAccess, false);
});

test('the owner and unshared forms are left out', () => {
  const owner = { _id: 'owner', name: 'Owner', email: 'o@x.gov', level: 4, assignedForms: [assignment()] };
  assert.deepEqual(buildShareList([{ ...form, sharedWithEmails: [] }], [owner], []), []);
});
