import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { inferSchoolYear } = require('../../../../../lib/schoolYear');
const { isFormLocked } = require('../../../../../lib/schoolYearSettings');
const { canEditForm } = require('../../../../../lib/formAccess');
const { reportError } = require('../../../../../lib/reportError');

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    if (!canEditForm(user, form)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (await isFormLocked(form)) {
      return NextResponse.json({ error: 'This school year is archived and read-only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const questionId = String(body.questionId || '').trim();
    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    form.needsUpdate = (form.needsUpdate || []).filter((item) => item.questionId !== questionId);
    form.markModified('needsUpdate');
    await form.save();

    return NextResponse.json({ success: true, needsUpdate: form.needsUpdate });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/review-flag', detail: 'Error reviewing question flag' });
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 });
  }
}
