import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { listSchools, createSchool } from '../../../../lib/schools';
import { clientSafeMessage, enforceRateLimit } from '../../../../lib/userAccess';
import { logAction } from '../../../../lib/auditLogger';
import { reportError } from '../../../../lib/reportError';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (Number(session.user.level) !== 5) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const activeOnly = new URL(request.url).searchParams.get('active') === '1';
    const schools = await listSchools({ activeOnly });
    return NextResponse.json({ schools });
  } catch (error) {
    reportError(error, { route: 'GET /api/admin/schools' });
    return NextResponse.json(
      { error: clientSafeMessage(error, 'Failed to load schools') },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:schools:${session?.user?.id || 'anon'}`, 20, 60);
    if (limited) return limited;

    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const school = await createSchool({
      name: body.name,
      dbn: body.dbn,
      notes: body.notes,
      createdBy: auth.session.user.id,
    });

    await logAction({
      userId: auth.session.user.id,
      userName: auth.session.user.name,
      userEmail: auth.session.user.email,
      action: 'school_created',
      targetType: 'school',
      targetId: school.id,
      details: `Created school: ${school.name}`,
      metadata: { schoolName: school.name, dbn: school.dbn },
      request,
    });

    return NextResponse.json({ school }, { status: 201 });
  } catch (error) {
    reportError(error, { route: 'POST /api/admin/schools' });
    return NextResponse.json(
      { error: clientSafeMessage(error, 'Failed to create school') },
      { status: error.status || 500 }
    );
  }
}
