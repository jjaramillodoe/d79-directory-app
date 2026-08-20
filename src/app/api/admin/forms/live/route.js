import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const User = require('../../../../../models/User');
const FormSubmission = require('../../../../../models/FormSubmission');
const { logAction } = require('../../../../../lib/auditLogger');
const { inferSchoolYear } = require('../../../../../lib/schoolYear');
const { getYearSettings } = require('../../../../../lib/schoolYearSettings');
const { reportError } = require('../../../../../lib/reportError');

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const formId = String(body.formId || '').trim();
    const live = Boolean(body.live);
    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const form = await FormSubmission.findById(formId);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    form.allowEditsWhenArchived = live;
    await form.save();

    const schoolYear = inferSchoolYear(form);
    const yearSettings = await getYearSettings(schoolYear);

    await logAction({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'settings_changed',
      targetType: 'form',
      targetId: String(form._id),
      details: live
        ? `Made ${form.schoolName} ${schoolYear} live so the principal can finish the archived-year plan`
        : `Returned ${form.schoolName} ${schoolYear} to archived read-only`,
      metadata: { schoolYear, live, yearArchived: yearSettings.archived },
      request,
    });

    return NextResponse.json({
      success: true,
      formId: String(form._id),
      schoolYear,
      yearArchived: Boolean(yearSettings.archived),
      allowEditsWhenArchived: live,
      locked: Boolean(yearSettings.archived) && !live,
    });
  } catch (error) {
    reportError(error, { route: 'POST /api/admin/forms/live' });
    return NextResponse.json({ error: 'Failed to update plan lock' }, { status: 500 });
  }
}
