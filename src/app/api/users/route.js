const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../lib/auth');
const connectDB = require('../../../lib/mongodb');
const User = require('../../../models/User');
const { jsonError, requireAdminActor, canManageTarget, schoolUserListFilter, enforceRateLimit } = require('../../../lib/userAccess');
const { reportError } = require('../../../lib/reportError');

async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:users:${session?.user?.id || 'anon'}`, 60, 60);
    if (limited) return limited;
    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    await connectDB();

    const query = schoolUserListFilter(actor);
    const users = await User.find(query)
      .select('name email level schoolName title isActive createdAt lastLogin')
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    reportError(error, { route: '/api/users', detail: 'Error fetching users' });
    return jsonError(500, 'Internal server error');
  }
}

async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:users-write:${session?.user?.id || 'anon'}`, 30, 60);
    if (limited) return limited;
    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    const { userId, level, schoolName, title, isActive } = await request.json();

    if (!userId) {
      return jsonError(400, 'User ID is required');
    }

    await connectDB();
    const userBeforeUpdate = await User.findById(userId);
    if (!userBeforeUpdate) {
      return jsonError(404, 'User not found');
    }

    if (!canManageTarget(actor, userBeforeUpdate)) {
      return jsonError(403, 'Forbidden: You cannot modify this user');
    }

    if (level !== undefined) {
      const nextLevel = Number(level);
      if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > 5) {
        return jsonError(400, 'Level must be between 1 and 5');
      }
      if (nextLevel >= actor.level) {
        return jsonError(403, 'Forbidden: You cannot assign a level at or above your own');
      }
      if (actor.level < 5 && nextLevel > 3) {
        return jsonError(403, 'Forbidden: You can only assign users to Level 1, 2, or 3');
      }
    }

    if (actor.level < 5 && schoolName !== undefined && schoolName !== actor.schoolName) {
      return jsonError(403, 'Forbidden: You can only keep users at your school');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(level !== undefined && { level: Number(level) }),
        ...(schoolName !== undefined && { schoolName }),
        ...(title !== undefined && { title }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    ).select('name email level schoolName title isActive createdAt lastLogin');

    if (!updatedUser) {
      return jsonError(404, 'User not found');
    }

    const changes = {};
    if (level !== undefined && Number(level) !== userBeforeUpdate.level) {
      changes.level = `${userBeforeUpdate.level} -> ${level}`;
    }
    if (schoolName !== undefined && schoolName !== userBeforeUpdate.schoolName) {
      changes.schoolName = `${userBeforeUpdate.schoolName} -> ${schoolName}`;
    }
    if (title !== undefined && title !== userBeforeUpdate.title) {
      changes.title = `${userBeforeUpdate.title || 'none'} -> ${title || 'none'}`;
    }
    if (isActive !== undefined && isActive !== userBeforeUpdate.isActive) {
      changes.isActive = `${userBeforeUpdate.isActive} -> ${isActive}`;
    }

    if (Object.keys(changes).length > 0) {
      const { logUserUpdated } = require('../../../lib/auditLogger');
      const requestObj = {
        headers: Object.fromEntries(request.headers || []),
        ip: null,
        connection: { remoteAddress: null },
      };
      logUserUpdated(session.user, updatedUser, changes, requestObj).catch((err) =>
        reportError(err, { route: '/api/users', detail: 'Error logging user update' })
      );
    }

    return new Response(JSON.stringify({ user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    reportError(error, { route: '/api/users', detail: 'Error updating user' });
    return jsonError(500, 'Internal server error');
  }
}

async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:users-write:${session?.user?.id || 'anon'}`, 30, 60);
    if (limited) return limited;
    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    const { userId } = await request.json();

    if (!userId) {
      return jsonError(400, 'User ID is required');
    }

    if (String(userId) === String(actor._id)) {
      return jsonError(400, 'Cannot delete your own account');
    }

    await connectDB();
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return jsonError(404, 'User not found');
    }

    if (!canManageTarget(actor, userToDelete)) {
      return jsonError(403, 'Forbidden: You cannot delete this user');
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return jsonError(404, 'User not found');
    }

    const { logUserDeleted } = require('../../../lib/auditLogger');
    const requestObj = {
      headers: Object.fromEntries(request.headers || []),
      ip: null,
      connection: { remoteAddress: null },
    };
    logUserDeleted(session.user, deletedUser, requestObj).catch((err) =>
      reportError(err, { route: '/api/users', detail: 'Error logging user deletion' })
    );

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    reportError(error, { route: '/api/users', detail: 'Error deleting user' });
    return jsonError(500, 'Internal server error');
  }
}

module.exports = { GET, PUT, DELETE };
