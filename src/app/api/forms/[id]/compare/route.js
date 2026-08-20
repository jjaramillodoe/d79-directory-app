import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormSubmission = require('../../../../../models/FormSubmission');
const User = require('../../../../../models/User');
const { inferSchoolYear, previousSchoolYear } = require('../../../../../lib/schoolYear');
const { getPublishedOrJson } = require('../../../../../lib/questionBank');
const { compareStepAnswers, getYearSettings } = require('../../../../../lib/schoolYearSettings');

export async function GET(request, { params }) {
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
    const current = await FormSubmission.findById(id).lean();
    if (!current) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const canView =
      user.level === 5 ||
      user.schoolName === current.schoolName ||
      String(current.userId) === String(user._id);
    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const currentYear = inferSchoolYear(current);
    const compareYear = String(searchParams.get('compareYear') || previousSchoolYear(currentYear)).trim();

    const candidates = await FormSubmission.find({ schoolName: current.schoolName }).sort({ updatedAt: -1 }).lean();
    const previous = candidates.find(
      (form) => String(form._id) !== String(current._id) && inferSchoolYear(form) === compareYear
    );

    const bank = await getPublishedOrJson({
      schoolYear: currentYear,
      version: current.questionBankVersion,
      preferPublished: current.status === 'draft',
    });
    const rows = compareStepAnswers(previous, current, bank.steps || []);
    const yearSettings = await getYearSettings(currentYear);

    return NextResponse.json({
      schoolName: current.schoolName,
      currentYear,
      compareYear,
      currentFormId: String(current._id),
      previousFormId: previous ? String(previous._id) : null,
      districtGoals: yearSettings.districtGoals,
      rows,
      changedCount: rows.filter((row) => row.changed).length,
    });
  } catch (error) {
    console.error('Error comparing forms:', error);
    return NextResponse.json({ error: 'Failed to compare forms' }, { status: 500 });
  }
}
