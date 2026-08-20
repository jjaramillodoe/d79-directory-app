import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { logAction } = require('../../../../../lib/auditLogger');
const { inferSchoolYear } = require('../../../../../lib/schoolYear');
const { isFormLocked } = require('../../../../../lib/schoolYearSettings');

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
    if (user.level < 4) {
      return NextResponse.json({ error: 'Only principals can attest to a school plan' }, { status: 403 });
    }

    const { id } = await params;
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    if (await isFormLocked(form)) {
      return NextResponse.json({ error: 'This school year is archived and read-only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || user.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Type your name to attest' }, { status: 400 });
    }

    form.attestation = {
      confirmed: true,
      name,
      signedAt: new Date(),
      signedBy: user._id,
    };
    await form.save();

    await logAction({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'form_attested',
      targetType: 'form',
      targetId: String(form._id),
      details: `${name} attested that the ${inferSchoolYear(form)} plan was reviewed`,
      request,
    });

    return NextResponse.json({ success: true, attestation: form.attestation });
  } catch (error) {
    console.error('Error saving attestation:', error);
    return NextResponse.json({ error: 'Failed to save attestation' }, { status: 500 });
  }
}
