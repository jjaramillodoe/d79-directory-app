const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../lib/auth');
const connectDB = require('../../../../lib/mongodb');
const User = require('../../../../models/User');
const { jsonError, requireAdminActor, enforceRateLimit } = require('../../../../lib/userAccess');
const { reportError } = require('../../../../lib/reportError');

async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:users-create:${session?.user?.id || 'anon'}`, 20, 60);
    if (limited) return limited;

    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    const { name, email, level, schoolName, title, isActive } = await request.json();

    if (!name || !email) {
      return jsonError(400, 'Name and email are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonError(400, 'Invalid email format');
    }

    if (!email.toLowerCase().endsWith('@schools.nyc.gov')) {
      return jsonError(400, 'Email must be from @schools.nyc.gov domain');
    }

    const nextLevel = level === undefined ? 3 : Number(level);
    if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > 5) {
      return jsonError(400, 'Level must be between 1 and 5');
    }
    if (nextLevel >= actor.level) {
      return jsonError(403, 'Forbidden: You cannot create a user at or above your own level');
    }
    if (actor.level < 5 && nextLevel > 3) {
      return jsonError(403, 'Forbidden: You can only create users with Level 1, 2, or 3');
    }

    const nextSchool = actor.level < 5
      ? actor.schoolName
      : (schoolName || '');
    if (actor.level < 5 && schoolName && schoolName !== actor.schoolName) {
      return jsonError(403, 'Forbidden: You can only create users at your school');
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return jsonError(409, 'User with this email already exists');
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      level: nextLevel,
      schoolName: nextSchool,
      title: title || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    const { logUserCreated } = require('../../../../lib/auditLogger');
    const requestObj = {
      headers: Object.fromEntries(request.headers || []),
      ip: null,
      connection: { remoteAddress: null },
    };
    logUserCreated(session.user, newUser, requestObj).catch((err) =>
      reportError(err, { route: '/api/users/create', detail: 'Error logging user creation' })
    );

    return new Response(JSON.stringify({
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        level: newUser.level,
        schoolName: newUser.schoolName,
        title: newUser.title,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    reportError(error, { route: '/api/users/create', detail: 'Error creating user' });
    return jsonError(500, 'Internal server error');
  }
}

module.exports = { POST };
