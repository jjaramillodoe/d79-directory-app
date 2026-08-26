import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FormSubmission from '../../../../../models/FormSubmission';
import User from '../../../../../models/User';
import { logAction } from '../../../../../lib/auditLogger';
import { duplicateForm, repairCopiedCompletions } from '../../../../../lib/formDuplicate';
import { isValidSchoolYear, schoolYearQuery } from '../../../../../lib/schoolYear';
import { clientSafeMessage } from '../../../../../lib/userAccess';
import { reportError } from '../../../../../lib/reportError';
import { archiveSchoolYear } from '../../../../../lib/schoolYearSettings';

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
    const sourceYear = String(body.sourceYear || '').trim();
    const targetYear = String(body.targetYear || '').trim();
    const force = Boolean(body.force);

    if (!isValidSchoolYear(sourceYear) || !isValidSchoolYear(targetYear)) {
      return NextResponse.json({ error: 'Source and target years must look like 2025-2026' }, { status: 400 });
    }
    if (sourceYear === targetYear) {
      return NextResponse.json({ error: 'Choose a different target school year' }, { status: 400 });
    }

    // Was `find({})` with no projection, no `.lean()`, and the year filter applied in JS,
    // so a rollover hydrated every form in the collection as a full Mongoose document to
    // keep one per school for a single year. `.lean()` is safe here because `duplicateForm`
    // reads plain fields and `cloneFormData` already handles a non-document source.
    const forms = await FormSubmission.find(schoolYearQuery(sourceYear))
      .sort({ updatedAt: -1 })
      .lean();

    // Still deduplicated in JS: the intent is the most recently updated form per school,
    // and the sort above already puts that one first.
    const bySchool = new Map();
    forms.forEach((form) => {
      if (!bySchool.has(form.schoolName)) bySchool.set(form.schoolName, form);
    });

    const created = [];
    const skipped = [];
    const errors = [];

    for (const source of bySchool.values()) {
      try {
        const result = await duplicateForm({
          source,
          targetSchoolYear: targetYear,
          actor: user,
          force,
        });
        created.push({
          school: source.schoolName,
          formId: String(result.form._id),
        });
      } catch (error) {
        const entry = {
          school: source.schoolName,
          error: clientSafeMessage(error, 'Could not create this plan.'),
          existingFormId: error.existingFormId || null,
        };
        if (error.status === 409) skipped.push(entry);
        else errors.push(entry);
      }
    }

    if (created.length > 0 || skipped.length > 0) {
      await archiveSchoolYear(sourceYear, user._id);
    }

    if (created.length > 0) {
      await repairCopiedCompletions(targetYear);
    }

    await logAction({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'form_duplicated',
      targetType: 'system',
      details: `Rolled ${created.length} school plans from ${sourceYear} to ${targetYear}`,
      metadata: {
        sourceYear,
        targetYear,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
      },
      request,
    }).catch((auditError) => {
      console.warn('Could not write rollover audit log:', auditError.message);
    });

    return NextResponse.json({
      success: true,
      sourceYear,
      targetYear,
      considered: bySchool.size,
      created,
      skipped,
      errors,
      archivedYear: sourceYear,
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/forms/rollover', detail: 'Error rolling over forms' });
    return NextResponse.json({ error: 'Failed to roll over forms' }, { status: 500 });
  }
}
