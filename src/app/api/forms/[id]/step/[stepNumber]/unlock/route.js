const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../../lib/auth');
const connectDB = require('../../../../../../../lib/mongodb');
const User = require('../../../../../../../models/User');
const { releaseLock } = require('../../../../../../../lib/locking');

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
    
    // Step key mapping
    const stepKeyMap = {
      1: 'tableOfContents',
      2: 'childAbuseIntervention',
      3: 'sexualHarassment',
      4: 'respectForAll',
      5: 'suicidePrevention',
      6: 'attendancePlan',
      7: 'temporaryHousing',
      8: 'serviceInSchools',
      9: 'planningInterviews',
      10: 'militaryRecruitment',
      11: 'schoolCulture',
      12: 'afterSchoolPrograms',
      13: 'cellPhonePolicy',
      14: 'counselingPlan'
    };

    const stepKey = stepKeyMap[stepNum];
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
    console.error('Error releasing lock:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// Export named exports for Next.js 16
export { POST };

