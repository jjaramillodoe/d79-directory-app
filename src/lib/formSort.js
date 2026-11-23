// Sorting and search for the admin collaboration form list.

const FORM_SORT_OPTIONS = [
  { value: 'school-asc', label: 'School (A–Z)' },
  { value: 'school-desc', label: 'School (Z–A)' },
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'created-desc', label: 'Newest first' },
  { value: 'created-asc', label: 'Oldest first' },
  { value: 'progress-desc', label: 'Most complete' },
  { value: 'progress-asc', label: 'Least complete' },
  { value: 'status', label: 'Status' },
  { value: 'shared-desc', label: 'Most shared' },
];

const DEFAULT_FORM_SORT = 'school-asc';

function time(value) {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(ms) ? 0 : ms;
}

function progress(form) {
  return Array.isArray(form.completedSteps) ? form.completedSteps.length : 0;
}

function bySchool(a, b) {
  return String(a.schoolName || '').localeCompare(String(b.schoolName || ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

/**
 * @param {object[]} forms
 * @param {string} sortKey one of FORM_SORT_OPTIONS values
 * @param {{ shareCount?: (form: object) => number }} [helpers]
 */
function sortForms(forms, sortKey = DEFAULT_FORM_SORT, { shareCount = () => 0 } = {}) {
  const compare = {
    'school-asc': bySchool,
    'school-desc': (a, b) => bySchool(b, a),
    'updated-desc': (a, b) => time(b.updatedAt) - time(a.updatedAt),
    'created-desc': (a, b) => time(b.createdAt) - time(a.createdAt),
    'created-asc': (a, b) => time(a.createdAt) - time(b.createdAt),
    'progress-desc': (a, b) => progress(b) - progress(a),
    'progress-asc': (a, b) => progress(a) - progress(b),
    status: (a, b) => String(a.status || '').localeCompare(String(b.status || '')),
    'shared-desc': (a, b) => shareCount(b) - shareCount(a),
  }[sortKey] || bySchool;

  // School name breaks ties so equal rows keep a predictable order.
  return [...forms].sort((a, b) => compare(a, b) || bySchool(a, b));
}

function filterForms(forms, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return forms;
  return forms.filter((form) =>
    [form.schoolName, form.status, form.schoolYear, form.principalName, form.principalEmail]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(needle))
  );
}

module.exports = { FORM_SORT_OPTIONS, DEFAULT_FORM_SORT, sortForms, filterForms };
