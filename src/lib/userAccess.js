const connectDB = require('./mongodb');
const User = require('../models/User');
const { canManageTarget, schoolUserListFilter } = require('./canManageUser');

function jsonError(status, error, extraHeaders = {}) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function productionFailClosed() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
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
  enforceRateLimit,
  productionFailClosed,
  requireAdminActor,
  canManageTarget,
  schoolUserListFilter,
  bulkTargetFilter,
};
