// Builds the "who is this form shared with" list for the admin collaboration tab.
// Pure: callers load the forms and users, this only joins and labels them.
const { describeFormAccess } = require('./formAccess');
const { inferSchoolYear } = require('./schoolYear');

function toId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function personName(person) {
  if (!person || typeof person !== 'object') return null;
  return person.name || person.email || null;
}

// Would this person still reach the form once this one share is removed?
// Same-school staff (levels 2-4) and Super Admins keep access through other grants.
function retainsAccessWithout(user, form, { dropAssignment = false, dropEmail = false } = {}) {
  if (!user) return false;
  const formId = toId(form._id);
  const strippedUser = dropAssignment
    ? { ...user, assignedForms: (user.assignedForms || []).filter((a) => toId(a.formId) !== formId) }
    : user;
  const email = normalizeEmail(user.email);
  const strippedForm = dropEmail
    ? { ...form, sharedWithEmails: (form.sharedWithEmails || []).filter((s) => normalizeEmail(s.email) !== email) }
    : form;
  return describeFormAccess(strippedUser, strippedForm).canView;
}

/**
 * @param {object[]} forms      forms in the viewer's scope (lean docs)
 * @param {object[]} assignees  users with assignedForms entries for those forms (lean docs)
 * @param {object[]} emailUsers users whose email matches a sharedWithEmails entry (lean docs)
 */
function buildShareList(forms, assignees = [], emailUsers = []) {
  const usersByEmail = new Map(emailUsers.map((u) => [normalizeEmail(u.email), u]));

  return forms
    .map((form) => {
      const formId = toId(form._id);
      const ownerId = toId(form.userId);
      const people = [];

      assignees.forEach((user) => {
        if (toId(user._id) === ownerId) return;
        const assignment = (user.assignedForms || []).find((a) => toId(a.formId) === formId);
        if (!assignment) return;
        people.push({
          kind: 'user',
          key: `user:${toId(user._id)}`,
          userId: toId(user._id),
          name: user.name || user.email,
          email: user.email,
          title: user.title || '',
          level: user.level ?? null,
          schoolName: user.schoolName || '',
          permissions: Number(user.level) === 3 ? 'edit' : assignment.permissions || 'edit',
          sharedAt: assignment.assignedAt || null,
          sharedBy: personName(assignment.assignedBy),
          retainsAccess: retainsAccessWithout(user, form, { dropAssignment: true }),
        });
      });

      (form.sharedWithEmails || []).forEach((share) => {
        const email = normalizeEmail(share.email);
        const user = usersByEmail.get(email);
        people.push({
          kind: 'email',
          key: `email:${email}`,
          userId: user ? toId(user._id) : null,
          name: user?.name || email,
          email,
          title: user?.title || '',
          level: user?.level ?? null,
          schoolName: user?.schoolName || '',
          permissions: share.permissions || 'view',
          sharedAt: share.sharedAt || null,
          sharedBy: personName(share.sharedBy),
          retainsAccess: retainsAccessWithout(user, form, { dropEmail: true }),
        });
      });

      people.sort((a, b) => String(a.name).localeCompare(String(b.name)));

      return {
        formId,
        schoolName: form.schoolName || '',
        schoolYear: inferSchoolYear(form),
        status: form.status || '',
        people,
      };
    })
    .filter((entry) => entry.people.length > 0)
    .sort(
      (a, b) =>
        String(b.schoolYear).localeCompare(String(a.schoolYear)) ||
        a.schoolName.localeCompare(b.schoolName)
    );
}

module.exports = { buildShareList, retainsAccessWithout };
