const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const User = require('../../../../../../models/User');
const FormSubmission = require('../../../../../../models/FormSubmission');
const { registerActiveEditor } = require('../../../../../../lib/activeEditors');
const { canEditForm } = require('../../../../../../lib/formAccess');
const { reportError } = require('../../../../../../lib/reportError');

// POST /api/forms/[id]/editors/register - Register as active editor
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

    const { id } = await params;
    const body = await request.json();
    const { stepKey } = body;

    if (!stepKey) {
      return NextResponse.json({ error: 'stepKey is required' }, { status: 400 });
    }

    const form = await FormSubmission.findById(id).select('userId schoolName principalEmail sharedWithEmails');
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    if (!canEditForm(user, form)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = user._id.toString();
    const registered = await registerActiveEditor(
      id,
      stepKey,
      userId,
      user.name || user.email,
      user.email,
      60 // 1 minute TTL (will be refreshed by heartbeat)
    );

    if (registered) {
      return NextResponse.json({
        success: true,
        message: 'Registered as active editor'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to register'
      }, { status: 500 });
    }
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/editors/register', detail: 'Error registering active editor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export named exports for Next.js 16
export { POST };

