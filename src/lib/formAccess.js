// Single source of truth for "who may read/write this plan".
//
// Levels: 1=Viewer, 2=Other Titles, 3=Assistant Principal, 4=Admin Principal, 5=Super Admin.
// Levels 2-4 get edit access to their own school's plan because there is exactly one
// plan per school per year, so school membership is equivalent to plan assignment.
// Level 1 gets no school-wide grant and must be assigned or shared in explicitly.
const SCHOOL_EDIT_LEVELS = [2, 3, 4];

function toId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function findAssignment(user, form) {
  const formId = toId(form._id);
  if (!formId) return null;
  return (user.assignedForms || []).find((entry) => toId(entry.formId) === formId) || null;
}

function findShare(user, form) {
  const email = normalizeEmail(user.email);
  if (!email) return null;
  return (form.sharedWithEmails || []).find((entry) => normalizeEmail(entry.email) === email) || null;
}

/**
 * Resolve every access grant a user has on a form.
 *
 * @returns {{
 *   canView: boolean,
 *   canEdit: boolean,
 *   permission: 'owner'|'edit'|'view'|null,
 *   grant: string|null,
 *   assignment: object|null,
 * }}
 */
function describeFormAccess(user, form) {
  const denied = { canView: false, canEdit: false, permission: null, grant: null, assignment: null };
  if (!user || !form) return denied;

  const level = Number(user.level) || 0;
  const userId = toId(user._id || user.id);
  const userEmail = normalizeEmail(user.email);

  const isOwner = Boolean(userId && toId(form.userId) && userId === toId(form.userId));
  const isPrincipalByEmail = Boolean(userEmail && normalizeEmail(form.principalEmail) === userEmail);
  const isSuperAdmin = level === 5;
  const isSameSchool =
    SCHOOL_EDIT_LEVELS.includes(level) &&
    Boolean(user.schoolName && form.schoolName && user.schoolName === form.schoolName);

  const assignment = findAssignment(user, form);
  // An assigned Assistant Principal always edits, regardless of the stored permission.
  const assignmentGrantsEdit = Boolean(assignment) && (level === 3 || assignment.permissions === 'edit');

  const share = findShare(user, form);
  const shareGrantsEdit = Boolean(share) && share.permissions === 'edit';

  if (isOwner || isPrincipalByEmail || isSuperAdmin) {
    let grant = 'owner';
    if (!isOwner) grant = isPrincipalByEmail ? 'principalEmail' : 'superAdmin';
    return { canView: true, canEdit: true, permission: 'owner', grant, assignment };
  }

  if (isSameSchool) {
    return { canView: true, canEdit: true, permission: 'edit', grant: 'sameSchool', assignment };
  }

  if (assignment) {
    return {
      canView: true,
      canEdit: assignmentGrantsEdit,
      permission: assignmentGrantsEdit ? 'edit' : assignment.permissions || 'view',
      grant: 'assignment',
      assignment,
    };
  }

  if (share) {
    return {
      canView: true,
      canEdit: shareGrantsEdit,
      permission: shareGrantsEdit ? 'edit' : 'view',
      grant: 'share',
      assignment: null,
    };
  }

  return denied;
}

function canViewForm(user, form) {
  return describeFormAccess(user, form).canView;
}

function canEditForm(user, form) {
  return describeFormAccess(user, form).canEdit;
}

module.exports = {
  SCHOOL_EDIT_LEVELS,
  describeFormAccess,
  canViewForm,
  canEditForm,
};
