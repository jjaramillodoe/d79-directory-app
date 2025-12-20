const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { getActiveEditors } = require('../../../../../lib/activeEditors');

// GET /api/forms/[id]/editors - Get all active editors for a form
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

    const formUserId = form.userId?.toString();
    const userId = user._id?.toString();
    const isOwner = formUserId === userId;
    const isPrincipalByEmail = form.principalEmail?.toLowerCase() === user.email?.toLowerCase();
    const isSuperAdmin = user.level === 5;
    const isSameSchool = user.schoolName === form.schoolName && (user.level === 2 || user.level === 3);
    const hasEditAccess = form.editAccess?.some(ea => ea.userId?.toString() === userId);
    const isAssignedLevel3 = user.level === 3 && form.assignedTo?.some(at => at.userId?.toString() === userId);
    const shareEntry = form.sharedWithEmails?.find(share => share.email?.toLowerCase() === user.email?.toLowerCase());

    if (!isOwner && !isPrincipalByEmail && !isSuperAdmin && !isSameSchool && !hasEditAccess && !isAssignedLevel3 && !shareEntry) {
      return NextResponse.json({ 
        error: 'Access denied',
        message: 'You do not have permission to view this form.'
      }, { status: 403 });
    }

    // Get all active editors for this form
    const editors = await getActiveEditors(id);

    // Group by step and remove duplicates (same user on same step)
    const stepMap = {};
    const uniqueEditors = [];
    const seenUsers = new Set();

    editors.forEach(editor => {
      const key = `${editor.userId}-${editor.stepKey}`;
      if (!seenUsers.has(key)) {
        seenUsers.add(key);
        if (!stepMap[editor.stepKey]) {
          stepMap[editor.stepKey] = [];
        }
        stepMap[editor.stepKey].push({
          userId: editor.userId,
          userName: editor.userName,
          email: editor.email,
          lastSeen: editor.lastSeen,
        });
        uniqueEditors.push(editor);
      }
    });

    return NextResponse.json({
      success: true,
      editors: uniqueEditors,
      editorsByStep: stepMap,
      totalEditors: uniqueEditors.length,
    });
  } catch (error) {
    console.error('Error getting active editors:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// Export named exports for Next.js 16
export { GET };

