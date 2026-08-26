const connectDB = require('./mongodb');
const User = require('../models/User');
const { canManageTarget, schoolUserListFilter } = require('./canManageUser');

function jsonError(status, error, extraHeaders = {}) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// Errors raised deliberately by this codebase carry a 4xx `status`, and their message is
// written to be read by the user ("A 2027-2028 plan already exists"). An error without
// one is unexpected -- Mongoose validation, cast errors, driver failures -- and its
// message can disclose schema internals and field values, so it is replaced.
function clientSafeMessage(error, fallback) {
  const status = Number(error?.status);
  if (Number.isInteger(status) && status >= 400 && status < 500 && error?.message) {
    return error.message;
  }
  return fallback;
}

// Defined in ./redis so that proxy.js middleware can share it without pulling in Mongoose.
function productionFailClosed() {
  return require('./redis').productionFailClosed();
}

async function enforceRateLimit(key, limit, windowSeconds, failClosed = productionFailClosed()) {
  const { rateLimit } = require('./redis');
  const limited = await rateLimit(key, limit, windowSeconds, { failClosed });
  if (limited.ok) return null;
  return jsonError(
    429,
    limited.unavailable ? 'Rate limiting is unavailable. Try again shortly.' : 'Too many requests',
    { 'Retry-After': String(limited.retryAfter || 60) }
  );
}

async function requireAdminActor(session) {
  if (!session?.user?.email) {
    return { error: jsonError(401, 'Unauthorized') };
  }

  await connectDB();
  const actor = await User.findOne({ email: session.user.email.toLowerCase() });
  if (!actor || actor.isActive === false || actor.level < 4) {
    return { error: jsonError(403, 'Forbidden: Admin access required') };
  }

  return { actor };
}

// Super Admins see the whole district; everyone else is confined to their own school.
// Use for any query that would otherwise read across schools (reports, timelines, audit logs).
function schoolScopeFilter(actor, field = 'schoolName') {
  if (Number(actor?.level) >= 5) return {};
  return { [field]: actor?.schoolName ?? null };
}

function bulkTargetFilter(actor, userIds = []) {
  const ids = (userIds || [])
    .map((id) => String(id || '').trim())
    .filter((id) => id && id !== String(actor._id));

  const match = {
    _id: { $in: ids },
    level: { $lt: actor.level },
  };

  if (actor.level < 5) {
    match.schoolName = actor.schoolName;
    match.level = { $lte: 3 };
  }

  return { ids, match };
}

module.exports = {
  jsonError,
  clientSafeMessage,
  enforceRateLimit,
  productionFailClosed,
  requireAdminActor,
  canManageTarget,
  schoolUserListFilter,
  schoolScopeFilter,
  bulkTargetFilter,
};
