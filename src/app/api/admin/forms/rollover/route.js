import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { logAction } = require('../../../../../lib/auditLogger');
const { duplicateForm } = require('../../../../../lib/formDuplicate');
const { inferSchoolYear, isValidSchoolYear } = require('../../../../../lib/schoolYear');

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

    const forms = await FormSubmission.find({}).sort({ updatedAt: -1 });
    const bySchool = new Map();

    forms.forEach((form) => {
      if (inferSchoolYear(form) !== sourceYear) return;
      const key = form.schoolName;
      if (!bySchool.has(key)) bySchool.set(key, form);
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
          error: error.message,
          existingFormId: error.existingFormId || null,
        };
        if (error.status === 409) skipped.push(entry);
        else errors.push(entry);
      }
    }

    if (created.length > 0 || skipped.length > 0) {
      const { archiveSchoolYear } = require('../../../../../lib/schoolYearSettings');
      await archiveSchoolYear(sourceYear, user._id);
    }

    if (created.length > 0) {
      const { repairCopiedCompletions } = require('../../../../../lib/formDuplicate');
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
    console.error('Error rolling over forms:', error);
    return NextResponse.json({ error: 'Failed to roll over forms' }, { status: 500 });
  }
}
