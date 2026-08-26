import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { logAction } = require('../../../../../lib/auditLogger');
const { duplicateForm } = require('../../../../../lib/formDuplicate');
const { inferSchoolYear, nextSchoolYear } = require('../../../../../lib/schoolYear');
const { canEditForm } = require('../../../../../lib/formAccess');
const { clientSafeMessage } = require('../../../../../lib/userAccess');
const { reportError } = require('../../../../../lib/reportError');

// Duplication mints a whole new plan, so it stays a principal-and-above action even
// though levels 2-3 may edit an existing one. Narrowing the shared edit rule rather
// than restating it keeps this from drifting away from the rest of the app.
function canDuplicate(user, form) {
  if (Number(user.level) < 4) return false;
  return canEditForm(user, form);
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
          error: clientSafeMessage(error, 'Failed to duplicate form'),
          existingFormId: error.existingFormId || null,
        },
        { status: error.status || 500 }
      );
    }
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/duplicate', detail: 'Error duplicating form' });
    return NextResponse.json({ error: 'Failed to duplicate form' }, { status: 500 });
  }
}
