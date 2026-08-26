import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import AuditLog from '../../../../models/AuditLog';
import User from '../../../../models/User';
import { requireAdminActor } from '../../../../lib/userAccess';
import { reportError } from '../../../../lib/reportError';

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    await connectDB();

    // Audit entries carry no school of their own, so a principal is scoped to the
    // actors on their own roster. Super Admins see the whole district.
    let scopedEmails = null;
    if (Number(actor.level) < 5) {
      const schoolUsers = await User.find({ schoolName: actor.schoolName })
        .select('email')
        .lean();
      scopedEmails = schoolUsers.map((entry) => entry.email);
    }

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
      userEmails: scopedEmails,
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
    const activityQuery = { 'activityLog.0': { $exists: true } };
    if (scopedEmails) {
      activityQuery.schoolName = actor.schoolName;
    }
    const users = await User.find(activityQuery)
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
    const totalCount = (await AuditLog.countLogs(filters)) + userActivityLogs.length;

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
    reportError(error, { route: '/api/users/audit-logs', detail: 'Fetch audit logs error' });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
