const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { getFormLocks, getLockInfo } = require('../../../../../lib/locking');
const { canViewForm } = require('../../../../../lib/formAccess');
const { reportError } = require('../../../../../lib/reportError');

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

