import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { updateSchool, deleteSchool } from '../../../../../lib/schools';
import { clientSafeMessage, enforceRateLimit } from '../../../../../lib/userAccess';
import { logAction } from '../../../../../lib/auditLogger';
import { reportError } from '../../../../../lib/reportError';

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

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:schools:${session?.user?.id || 'anon'}`, 20, 60);
    if (limited) return limited;

    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await updateSchool(id, {
      name: body.name,
      dbn: body.dbn,
      notes: body.notes,
      isActive: body.isActive,
    });

    await logAction({
      userId: auth.session.user.id,
      userName: auth.session.user.name,
      userEmail: auth.session.user.email,
      action: 'school_updated',
      targetType: 'school',
      targetId: id,
      details: `Updated school: ${result.school.name}`,
      metadata: {
        schoolName: result.school.name,
        renamedUsers: result.renamedUsers,
        renamedForms: result.renamedForms,
        isActive: result.school.isActive,
      },
      request,
    });

    return NextResponse.json(result);
  } catch (error) {
    reportError(error, { route: 'PATCH /api/admin/schools/[id]' });
    return NextResponse.json(
      { error: clientSafeMessage(error, 'Failed to update school') },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const limited = await enforceRateLimit(`rl:schools:${session?.user?.id || 'anon'}`, 20, 60);
    if (limited) return limited;

    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const result = await deleteSchool(id);

    await logAction({
      userId: auth.session.user.id,
      userName: auth.session.user.name,
      userEmail: auth.session.user.email,
      action: 'school_deleted',
      targetType: 'school',
      targetId: id,
      details: `Deleted school: ${result.name}`,
      metadata: { schoolName: result.name },
      request,
    });

    return NextResponse.json(result);
  } catch (error) {
    reportError(error, { route: 'DELETE /api/admin/schools/[id]' });
    return NextResponse.json(
      { error: clientSafeMessage(error, 'Failed to delete school') },
      { status: error.status || 500 }
    );
  }
}
