/**
 * School names are stored as display strings on User and FormSubmission. The
 * catalog uses a normalized key so "PS 1" and "ps  1" cannot both exist.
 */

function normalizeSchoolName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function schoolNameKey(value) {
  return normalizeSchoolName(value).toLowerCase();
}

/**
 * @param {number} status
 * @param {string} message
 * @returns {Error & { status: number }}
 */
function httpError(status, message) {
  const error = /** @type {Error & { status: number }} */ (new Error(message));
  error.status = status;
  return error;
}

module.exports = {
  normalizeSchoolName,
  schoolNameKey,
  httpError,
};
