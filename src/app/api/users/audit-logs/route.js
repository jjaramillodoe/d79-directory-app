const { NextResponse } = require('next/server');
const connectDB = require('../../../../lib/mongodb');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../lib/auth');
const AuditLog = require('../../../../models/AuditLog');
const User = require('../../../../models/User');

async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.level < 4) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userEmail = searchParams.get('userEmail');
    const targetType = searchParams.get('targetType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build filters
    const filters = {
      action: action || null,
      userEmail: userEmail || null,
      targetType: targetType || null,
      startDate: startDate || null,
      endDate: endDate || null,
      limit: Math.min(limit, 1000), // Max 1000 logs per request
      skip: skip,
    };

    // Get logs from AuditLog collection
    const auditLogs = await AuditLog.getLogs(filters);

    // Also get logs from User activityLog arrays (for backward compatibility)
    const userActivityLogs = [];
    const users = await User.find({ 'activityLog.0': { $exists: true } })
      .select('name email activityLog')
      .lean();

    for (const user of users) {
      if (user.activityLog && user.activityLog.length > 0) {
        for (const log of user.activityLog) {
          // Apply filters
          if (action && log.action !== action) continue;
          if (userEmail && user.email !== userEmail) continue;
          if (startDate && new Date(log.timestamp) < new Date(startDate)) continue;
          if (endDate && new Date(log.timestamp) > new Date(endDate)) continue;

          userActivityLogs.push({
            _id: log._id || new Date().getTime(),
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            action: log.action,
            targetType: 'other',
            targetId: log.target ? log.target : null,
            details: log.details || '',
            timestamp: log.timestamp,
            ipAddress: null,
            userAgent: null,
            metadata: {},
          });
        }
      }
    }

    // Combine and sort all logs
    const allLogs = [...auditLogs, ...userActivityLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + limit);

    // Get total count for pagination
    const totalCount = await AuditLog.countDocuments(
      Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => 
          value !== null && !['limit', 'skip'].includes(key)
        )
      )
    ) + userActivityLogs.length;

    return new Response(JSON.stringify({ 
      success: true,
      logs: allLogs,
      total: totalCount,
      limit,
      skip,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

module.exports = { GET };
