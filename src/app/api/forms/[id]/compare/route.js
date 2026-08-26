import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FormSubmission from '../../../../../models/FormSubmission';
import User from '../../../../../models/User';
import { inferSchoolYear, previousSchoolYear } from '../../../../../lib/schoolYear';
import { getPublishedOrJson } from '../../../../../lib/questionBank';
import { compareStepAnswers, getYearSettings } from '../../../../../lib/schoolYearSettings';
import { canViewForm } from '../../../../../lib/formAccess';
import { reportError } from '../../../../../lib/reportError';

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

    if (!canViewForm(user, current)) {
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
    reportError(error, { route: '/api/forms/[id]/compare', detail: 'Error comparing forms' });
    return NextResponse.json({ error: 'Failed to compare forms' }, { status: 500 });
  }
}
