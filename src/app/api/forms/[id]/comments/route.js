const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormComment = require('../../../../../models/FormComment');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { reportError } = require('../../../../../lib/reportError');

// POST /api/forms/[id]/comments - Add a new comment (Level 5 only)
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

    // Only Level 5 (Super Admin) can add comments
    if (user.level !== 5) {
      return NextResponse.json({ error: 'Only Super Admins can add comments' }, { status: 403 });
    }

    const { id } = await params;
    
    // Validate form ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }
    
    const form = await FormSubmission.findById(id);
    
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      reportError(parseError, { route: '/api/forms/[id]/comments', detail: 'Error parsing request body' });
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { comment, status, stepNumber, stepKey } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    if (!status || !['approved', 'rejected', 'under_review'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    // Create the comment
    const newComment = await FormComment.create({
      formId: form._id,
      reviewedBy: user._id,
      reviewedByName: user.name,
      reviewedByEmail: user.email,
      comment: comment.trim(),
      status: status,
      stepNumber: stepNumber || null,
      stepKey: stepKey || null,
      reviewedAt: new Date(),
      isActive: true,
      isFixed: false,
    });

    // If this is a general comment (not step-specific), update form status
    if (!stepNumber) {
      form.status = status;
      form.reviewedBy = user._id;
      form.reviewedAt = new Date();
      
      if (['approved', 'rejected'].includes(status)) {
        form.notificationSent = true;
        form.notificationSentAt = new Date();
      }
      
      await form.save();
    }

    // Populate the reviewer info
    await newComment.populate('reviewedBy', 'name email');

    return NextResponse.json({ 
      success: true, 
      comment: newComment,
      message: 'Comment added successfully' 
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/comments', detail: 'Error adding comment' });
    // Ensure we always return JSON, even on errors
    try {
      return NextResponse.json({
        error: 'Internal server error',
        // Stack traces stay out of production responses.
        ...(process.env.NODE_ENV === 'development' && { details: error.stack }),
      }, { status: 500 });
    } catch (jsonError) {
      // Fallback if JSON.stringify fails
      reportError(jsonError, { route: '/api/forms/[id]/comments', detail: 'Failed to create JSON response' });
      return new NextResponse(
        JSON.stringify({ 
          error: 'Internal server error',
          message: 'Failed to process request'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

module.exports = { POST };

