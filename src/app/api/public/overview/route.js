import { NextResponse } from 'next/server';

const connectDB = require('../../../../lib/mongodb');
const FormSubmission = require('../../../../models/FormSubmission');
const User = require('../../../../models/User');
const { getPublishedOrJson } = require('../../../../lib/questionBank');
const { currentSchoolYear, previousSchoolYear, inferSchoolYear } = require('../../../../lib/schoolYear');
const { cacheGet, cacheSet } = require('../../../../lib/redis');
const { reportError } = require('../../../../lib/reportError');

export async function GET() {
  try {
    const currentYear = currentSchoolYear();
    const previousYear = previousSchoolYear(currentYear);
    const cacheKey = `public:overview:${currentYear}`;
    const cached = await cacheGet(cacheKey);
    if (cached?.currentYear) {
      return NextResponse.json(cached);
    }

    await connectDB();
    const bank = await getPublishedOrJson({ schoolYear: currentYear });
    const requiredPlans = bank?.steps?.length || 15;

    const [principals, forms] = await Promise.all([
      User.countDocuments({ level: 4, isActive: { $ne: false } }),
      FormSubmission.find({}).select('schoolName schoolYear status createdAt').lean(),
    ]);

    const schools = new Set(
      forms.map((form) => form.schoolName).filter(Boolean)
    );
    const thisYear = forms.filter((form) => inferSchoolYear(form) === currentYear);
    const submittedThisYear = thisYear.filter((form) =>
      ['submitted', 'under_review', 'approved'].includes(form.status)
    ).length;

    const payload = {
      currentYear,
      previousYear,
      requiredPlans,
      schoolsServed: schools.size || principals || 24,
      currentYearPlans: thisYear.length,
      submittedThisYear,
    };
    await cacheSet(cacheKey, payload, 60);
    return NextResponse.json(payload);
  } catch (error) {
    reportError(error, { route: 'GET /api/public/overview' });
    return NextResponse.json({
      currentYear: currentSchoolYear(),
      previousYear: previousSchoolYear(currentSchoolYear()),
      requiredPlans: 15,
      schoolsServed: 24,
      currentYearPlans: 0,
      submittedThisYear: 0,
    });
  }
}
