const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const FormComment = require('../../../../../../models/FormComment');
const FormSubmission = require('../../../../../../models/FormSubmission');
const User = require('../../../../../../models/User');

// PUT /api/forms/[id]/comments/[commentId] - Mark comment as read or fixed
async function PUT(request, { params }) {
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

    const { id, commentId } = await params;
    const body = await request.json();
    const { action } = body; // 'read' or 'fixed'

    if (!action || !['read', 'fixed'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "read" or "fixed"' }, { status: 400 });
    }

    const comment = await FormComment.findOne({ 
      _id: commentId, 
      formId: id,
      isActive: true 
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Verify user has access to this form
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const formUserId = form.userId?._id?.toString() || form.userId?.toString();
    const isOwner = formUserId === user._id.toString();
    const isPrincipalByEmail = form.principalEmail && form.principalEmail.toLowerCase() === user.email.toLowerCase();
    const isSuperAdmin = user.level === 5;
    const isPrincipal = user.level === 4;
    const isSameSchool = isPrincipal && user.schoolName && form.schoolName && 
                         user.schoolName === form.schoolName;

    if (!isOwner && !isPrincipalByEmail && !isSuperAdmin && !isSameSchool) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update comment based on action
    if (action === 'read') {
      comment.readBy = user._id;
      comment.readAt = new Date();
    } else if (action === 'fixed') {
      comment.isFixed = true;
      comment.fixedBy = user._id;
      comment.fixedAt = new Date();
    }

    await comment.save();

    return NextResponse.json({ 
      success: true, 
      comment: comment,
      message: `Comment marked as ${action}` 
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

module.exports = { PUT };

