import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../lib/auth');
const { getSystemHealth } = require('../../../../lib/systemHealth');
const { flushAppCaches, resetRedisBackoff } = require('../../../../lib/redis');
const { logAction } = require('../../../../lib/auditLogger');
const { auditRequest } = require('../../../../lib/questionBank');
const { reportError } = require('../../../../lib/reportError');

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.level !== 5) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const health = await getSystemHealth();
    return NextResponse.json(health);
  } catch (error) {
    reportError(error, { route: 'GET /api/admin/health' });
    return NextResponse.json({ error: 'Failed to load system health' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'flush-cache') {
      const flushed = await flushAppCaches();
      await logAction({
        userId: auth.session.user.id,
        userName: auth.session.user.name,
        userEmail: auth.session.user.email,
        action: 'settings_changed',
        targetType: 'system',
        details: `Flushed app caches (${flushed.total} keys)`,
        metadata: flushed,
        request: auditRequest(request),
      });
      const health = await getSystemHealth();
      return NextResponse.json({ success: true, flushed, ...health });
    }

    if (action === 'retry-redis') {
      resetRedisBackoff();
      await logAction({
        userId: auth.session.user.id,
        userName: auth.session.user.name,
        userEmail: auth.session.user.email,
        action: 'settings_changed',
        targetType: 'system',
        details: 'Retried Redis connection',
        request: auditRequest(request),
      });
      const health = await getSystemHealth();
      return NextResponse.json({ success: true, ...health });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    reportError(error, { route: 'POST /api/admin/health' });
    return NextResponse.json({ error: 'Failed to run system action' }, { status: 500 });
  }
}
