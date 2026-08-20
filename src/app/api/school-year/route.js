import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../lib/auth');
const connectDB = require('../../../lib/mongodb');
const User = require('../../../models/User');
const FormTemplate = require('../../../models/FormTemplate');
const { logAction } = require('../../../lib/auditLogger');
const { currentSchoolYear, isValidSchoolYear } = require('../../../lib/schoolYear');
const { getYearSettings, upsertYearSettings, getYearPlanCounts, previewNextSchoolYear, initializeNextSchoolYear } = require('../../../lib/schoolYearSettings');
const { FALLBACK_STEP_KEYS } = require('../../../lib/formSteps');
const { reportError } = require('../../../lib/reportError');

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolYear = String(searchParams.get('schoolYear') || currentSchoolYear()).trim();
    const [settings, planCounts, cycle] = await Promise.all([
      getYearSettings(schoolYear),
      getYearPlanCounts(schoolYear),
      previewNextSchoolYear(),
    ]);

    await connectDB();
    const versions = await FormTemplate.find({})
      .select('version status schoolYear publishedAt')
      .sort({ version: -1 })
      .lean();

    return NextResponse.json({
      ...settings,
      planCounts,
      stepKeys: FALLBACK_STEP_KEYS,
      versions,
      cycle,
    });
  } catch (error) {
    reportError(error, { route: 'GET /api/school-year' });
    return NextResponse.json({ error: 'Failed to load school year settings' }, { status: 500 });
  }
}

export async function PUT(request) {
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
    const schoolYear = String(body.schoolYear || '').trim();
    if (!isValidSchoolYear(schoolYear)) {
      return NextResponse.json({ error: 'Enter a school year like 2026-2027' }, { status: 400 });
    }

    const settings = await upsertYearSettings(schoolYear, body, user._id);
    await logAction({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'settings_changed',
      targetType: 'system',
      details: `Updated ${schoolYear} settings${
        typeof body.archived === 'boolean' ? (body.archived ? ' (archived)' : ' (made live)') : ''
      }`,
      metadata: { schoolYear, archived: settings.archived, questionBankVersion: settings.questionBankVersion },
      request,
    });

    return NextResponse.json({ success: true, ...settings });
  } catch (error) {
    reportError(error, { route: 'PUT /api/school-year' });
    return NextResponse.json({ error: error.message || 'Failed to save school year settings' }, { status: error.status || 500 });
  }
}

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
    const fromYear = String(body.fromYear || '').trim();
    const result = await initializeNextSchoolYear({
      fromYear: isValidSchoolYear(fromYear) ? fromYear : undefined,
      userId: user._id,
    });

    await logAction({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'settings_changed',
      targetType: 'system',
      details: `Set up ${result.nextYear} from ${result.sourceYear}`,
      metadata: {
        schoolYear: result.nextYear,
        sourceYear: result.sourceYear,
        questionBankVersion: result.carryOver?.questionBankVersion || null,
        term: result.term,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      schoolYear: result.nextYear,
      sourceYear: result.sourceYear,
      term: result.term,
      carriedOver: result.carryOver,
      settings: result.settings,
    });
  } catch (error) {
    reportError(error, { route: 'POST /api/school-year' });
    return NextResponse.json(
      {
        error: error.message || 'Failed to set up the next school year',
        existingYear: error.existingYear || undefined,
      },
      { status: error.status || 500 }
    );
  }
}
