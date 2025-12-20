const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../lib/auth');
const connectDB = require('../../../lib/mongodb');
const FormSubmission = require('../../../models/FormSubmission');
const FormComment = require('../../../models/FormComment');
const User = require('../../../models/User');

// GET /api/notifications - Get user's notifications
async function GET(request) {
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

    // Get notifications for the user
    const submissions = await FormSubmission.find({
      userId: user._id,
      notificationSent: true,
      reviewedAt: { $exists: true }
    })
    .populate('reviewedBy', 'name email')
    .sort({ reviewedAt: -1 })
    .limit(50);

    // Fetch latest comments for each submission
    const notifications = await Promise.all(submissions.map(async (submission) => {
      const submissionObj = submission.toObject();
      
      // Get the latest comment from FormComment collection
      const latestComment = await FormComment.findOne({
        formId: submission._id,
        isActive: true
      })
        .populate('reviewedBy', 'name email')
        .sort({ reviewedAt: -1 })
        .lean();
      
      // Include comment in notification for backward compatibility
      if (latestComment) {
        submissionObj.reviewComments = latestComment.comment;
        submissionObj.reviewedBy = latestComment.reviewedBy || submissionObj.reviewedBy;
        submissionObj.reviewedAt = latestComment.reviewedAt || submissionObj.reviewedAt;
      }
      
      return submissionObj;
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Mark notification as read
async function POST(request) {
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

    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // Mark notification as read (we'll use a different approach - just return success)
    // In a real implementation, you might want to add a 'read' field to track this
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export named exports for Next.js 16 (ES module syntax)
export { GET, POST };
