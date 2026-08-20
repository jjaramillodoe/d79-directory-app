import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { logAction } = require('../../../../../lib/auditLogger');
const { duplicateForm } = require('../../../../../lib/formDuplicate');
const { inferSchoolYear, nextSchoolYear } = require('../../../../../lib/schoolYear');

function canDuplicate(user, form) {
  if (user.level === 5) return true;
  if (user.level === 4 && user.schoolName === form.schoolName) return true;
  return form.userId?.toString() === user._id.toString();
}

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
      return NextResponse.json({ error: 'Only principals and Super Admins can duplicate forms' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const source = await FormSubmission.findById(id);
    if (!source) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    if (!canDuplicate(user, source)) {
      return NextResponse.json({ error: 'You do not have access to duplicate this form' }, { status: 403 });
    }

    const targetSchoolYear = String(body.schoolYear || nextSchoolYear(inferSchoolYear(source))).trim();

    try {
      const result = await duplicateForm({
        source,
        targetSchoolYear,
        actor: user,
        force: Boolean(body.force),
      });

      await logAction({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        action: 'form_duplicated',
        targetType: 'form',
        targetId: String(result.form._id),
        details: `Duplicated ${source.schoolName} from ${result.sourceYear} to ${result.targetSchoolYear}`,
        metadata: {
          sourceFormId: String(source._id),
          sourceYear: result.sourceYear,
          targetYear: result.targetSchoolYear,
        },
        request,
      }).catch((auditError) => {
        console.warn('Could not write duplicate audit log:', auditError.message);
      });

      return NextResponse.json({
        success: true,
        formId: String(result.form._id),
        schoolYear: result.targetSchoolYear,
        sourceYear: result.sourceYear,
        message: `Created a ${result.targetSchoolYear} draft from the ${result.sourceYear} plan. Answers were copied; reviews and comments were not.`,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error.message || 'Failed to duplicate form',
          existingFormId: error.existingFormId || null,
        },
        { status: error.status || 500 }
      );
    }
  } catch (error) {
    console.error('Error duplicating form:', error);
    return NextResponse.json({ error: 'Failed to duplicate form' }, { status: 500 });
  }
}
