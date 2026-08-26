import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FormSubmission from '../../../../../models/FormSubmission';
import User from '../../../../../models/User';
import { getFormLocks, getLockInfo } from '../../../../../lib/locking';
import { canViewForm } from '../../../../../lib/formAccess';
import { reportError } from '../../../../../lib/reportError';

// GET /api/forms/[id]/locks - Get all active locks for a form
async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;

    // Check if user has permission to view this form
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (!canViewForm(user, form)) {
      return NextResponse.json({ 
        error: 'Access denied',
        message: 'You do not have permission to view this form.'
      }, { status: 403 });
    }

    // Get all active locks for this form
    const locks = await getFormLocks(id);

    return NextResponse.json({
      success: true,
      locks: locks.map(lock => ({
        stepKey: lock.stepKey,
        lockedBy: {
          userId: lock.userId,
          userName: lock.userName,
          email: lock.email,
        },
        lockedAt: lock.lockedAt,
        expiresAt: lock.expiresAt,
        isCurrentUser: lock.userId === userId,
      })),
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/locks', detail: 'Error getting form locks' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export named exports for Next.js 16
export { GET };

