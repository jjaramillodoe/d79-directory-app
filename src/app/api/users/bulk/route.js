const connectDB = require('../../../../lib/mongodb');
const User = require('../../../../models/User');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../lib/auth');
const { jsonError, requireAdminActor, bulkTargetFilter, enforceRateLimit } = require('../../../../lib/userAccess');
const { reportError } = require('../../../../lib/reportError');

async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:users-bulk:${session?.user?.id || 'anon'}`, 10, 60);
    if (limited) return limited;
    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    const { userIds, action } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return jsonError(400, 'Invalid user IDs');
    }

    if (!action) {
      return jsonError(400, 'Action is required');
    }

    await connectDB();
    const { ids, match } = bulkTargetFilter(actor, userIds);
    if (ids.length === 0) {
      return jsonError(403, 'No eligible users for this action');
    }

    let result;
    let message;

    switch (action) {
      case 'activate':
        result = await User.updateMany(match, { $set: { isActive: true } });
        message = `Activated ${result.modifiedCount} users`;
        break;

      case 'deactivate':
        result = await User.updateMany(match, { $set: { isActive: false } });
        message = `Deactivated ${result.modifiedCount} users`;
        break;

      case 'delete':
        result = await User.deleteMany(match);
        message = `Deleted ${result.deletedCount} users`;
        break;

      case 'level_up':
        result = await User.updateMany(
          {
            ...match,
            level: actor.level < 5 ? { $lt: 3 } : { $lt: 4 },
          },
          { $inc: { level: 1 } }
        );
        message = `Promoted ${result.modifiedCount} users`;
        break;

      case 'level_down':
        result = await User.updateMany(
          { ...match, level: { $gt: 1 } },
          { $inc: { level: -1 } }
        );
        message = `Demoted ${result.modifiedCount} users`;
        break;

      default:
        return jsonError(400, 'Invalid action');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
        result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    reportError(error, { route: '/api/users/bulk', detail: 'Bulk user action error' });
    return jsonError(500, 'Internal server error');
  }
}

module.exports = { POST };
