import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../../lib/auth';
import connectDB from '../../../../../../../lib/mongodb';
import User from '../../../../../../../models/User';
import { releaseLock } from '../../../../../../../lib/locking';
import { getPublishedOrJson } from '../../../../../../../lib/questionBank';
import { getStepKeyByNumber } from '../../../../../../../lib/formSteps';
import { reportError } from '../../../../../../../lib/reportError';

// POST /api/forms/[id]/step/[stepNumber]/unlock - Release lock for a step
async function POST(request, { params }) {
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

    const { id, stepNumber } = await params;
    const stepNum = parseInt(stepNumber);
    const bank = await getPublishedOrJson();
    const stepKey = getStepKeyByNumber(bank.steps, stepNum);
    if (!stepKey) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    const userId = user._id.toString();
    const released = await releaseLock(id, stepKey, userId);

    if (released) {
      return NextResponse.json({
        success: true,
        message: 'Lock released successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Lock not found or already released'
      });
    }
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/step/[stepNumber]/unlock', detail: 'Error releasing lock' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export named exports for Next.js 16
export { POST };

