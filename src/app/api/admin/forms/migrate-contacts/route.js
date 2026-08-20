import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const User = require('../../../../../models/User');
const { logAction } = require('../../../../../lib/auditLogger');
const { auditRequest } = require('../../../../../lib/questionBank');
const { reportError } = require('../../../../../lib/reportError');
const { isValidSchoolYear, currentSchoolYear } = require('../../../../../lib/schoolYear');
const {
  listMigratableQuestions,
  previewContactMigration,
  applyContactMigration,
} = require('../../../../../lib/migrateTextareaContacts');

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user || user.level !== 5) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 }) };
  }
  return { session, user };
}

export async function GET(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const year = String(request.nextUrl.searchParams.get('year') || currentSchoolYear()).trim();
    if (!isValidSchoolYear(year)) {
      return NextResponse.json({ error: 'Enter a school year like 2026-2027' }, { status: 400 });
    }

    const questions = await listMigratableQuestions(year);
    return NextResponse.json({ year, questions });
  } catch (error) {
    reportError(error, { route: 'GET /api/admin/forms/migrate-contacts' });
    return NextResponse.json({ error: error.message || 'Could not scan answers' }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const year = String(body.year || currentSchoolYear()).trim();
    const questionId = String(body.questionId || '').trim();
    const apply = Boolean(body.apply);
    const formIds = Array.isArray(body.formIds) ? body.formIds.map(String) : [];

    if (!isValidSchoolYear(year)) {
      return NextResponse.json({ error: 'Enter a school year like 2026-2027' }, { status: 400 });
    }
    if (!questionId) {
      return NextResponse.json({ error: 'Choose a question to convert' }, { status: 400 });
    }

    if (!apply) {
      const preview = await previewContactMigration({ schoolYear: year, questionId });
      return NextResponse.json({ success: true, apply: false, ...preview });
    }

    const result = await applyContactMigration({ schoolYear: year, questionId, formIds });
    await logAction({
      userId: auth.user._id,
      userName: auth.session.user.name,
      userEmail: auth.session.user.email,
      action: 'bulk_action',
      targetType: 'form',
      details: `Converted ${result.applied} ${year} text answers into table rows for ${questionId}`,
      metadata: {
        schoolYear: year,
        questionId,
        applied: result.applied,
        needingReview: result.needingReview,
      },
      request: auditRequest(request),
    });

    return NextResponse.json({ success: true, apply: true, ...result });
  } catch (error) {
    reportError(error, { route: 'POST /api/admin/forms/migrate-contacts' });
    return NextResponse.json({ error: error.message || 'Could not convert answers' }, { status: error.status || 500 });
  }
}
