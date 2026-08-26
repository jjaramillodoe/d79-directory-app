import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import FormSubmission from '../../../../models/FormSubmission';
import { requireAdminActor, schoolScopeFilter } from '../../../../lib/userAccess';
import { reportError } from '../../../../lib/reportError';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const auth = await requireAdminActor(session);
    if (auth.error) return auth.error;
    const { actor } = auth;

    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      reportError(dbError, { route: '/api/admin/timeline', detail: 'Database connection failed' });
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if FormSubmission model is available
    if (!FormSubmission) {
      console.error('FormSubmission model not found');
      return NextResponse.json({ error: 'FormSubmission model not available' }, { status: 500 });
    }

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * dayMs);
    const twentyDaysAgo = new Date(now.getTime() - 20 * dayMs);
    const tenDaysAgo = new Date(now.getTime() - 10 * dayMs);
    const sevenDaysAgo = new Date(now.getTime() - 7 * dayMs);

    // Counted in the database rather than in JS. This route used to read every submission
    // the actor can see and tally it in a forEach; the counts are now accumulated in a
    // single grouping stage, so the documents never leave the server.
    //
    // Note the bucket names are inherited and misleading: '10_days_ago' holds the most
    // recent ten days, not the tenth day back. Preserved verbatim because the dashboard
    // reads these keys.
    const STATUS_FIELDS = [
      ['submitted', 'submitted'],
      ['approved', 'approved'],
      ['under_review', 'underReview'],
    ];

    const countWhere = (conditions) => ({
      $sum: { $cond: [{ $and: conditions }, 1, 0] },
    });

    // Half-open ranges, matching the original nested if/else exactly: each submission lands
    // in at most one bucket, and anything older than 30 days lands in none.
    const buckets = {
      '10_days_ago': [{ $gte: ['$createdAt', tenDaysAgo] }],
      '20_days_ago': [
        { $gte: ['$createdAt', twentyDaysAgo] },
        { $lt: ['$createdAt', tenDaysAgo] },
      ],
      '30_days_ago': [
        { $gte: ['$createdAt', thirtyDaysAgo] },
        { $lt: ['$createdAt', twentyDaysAgo] },
      ],
    };

    const accumulators = { total: { $sum: 1 } };
    for (const [status, key] of STATUS_FIELDS) {
      accumulators[`total__${key}`] = countWhere([{ $eq: ['$status', status] }]);
    }
    for (const [bucket, range] of Object.entries(buckets)) {
      for (const [status, key] of STATUS_FIELDS) {
        accumulators[`${bucket}__${key}`] = countWhere([
          ...range,
          { $eq: ['$status', status] },
        ]);
      }
    }
    accumulators.weekly__submitted = countWhere([
      { $gte: ['$createdAt', sevenDaysAgo] },
      { $eq: ['$status', 'submitted'] },
    ]);
    accumulators.weekly__approved = countWhere([
      { $gte: ['$createdAt', sevenDaysAgo] },
      { $eq: ['$status', 'approved'] },
    ]);

    let counts;
    try {
      const [row] = await FormSubmission.aggregate([
        { $match: schoolScopeFilter(actor) },
        { $group: { _id: null, ...accumulators } },
      ]);
      // $group yields no row at all when nothing matches, which is a real case for a
      // principal at a school with no plans yet.
      counts = row || {};
    } catch (findError) {
      reportError(findError, { route: '/api/admin/timeline', detail: 'Error aggregating submissions' });
      return NextResponse.json({ error: 'Failed to retrieve submissions' }, { status: 500 });
    }

    const at = (key) => counts[key] || 0;

    const timelineData = {};
    for (const bucket of Object.keys(buckets)) {
      timelineData[bucket] = {
        submitted: at(`${bucket}__submitted`),
        approved: at(`${bucket}__approved`),
        underReview: at(`${bucket}__underReview`),
      };
    }
    // The response has always carried a 'today' bucket that nothing ever incremented.
    // Kept at zero so the shape the dashboard expects does not change.
    timelineData.today = { submitted: 0, approved: 0, underReview: 0 };

    const formattedData = {
      timeline: timelineData,
      weekly: {
        submitted: at('weekly__submitted'),
        approved: at('weekly__approved'),
      },
      totals: {
        submitted: at('total__submitted'),
        approved: at('total__approved'),
        underReview: at('total__underReview'),
        total: at('total'),
      },
    };

    return NextResponse.json({ data: formattedData });

  } catch (error) {
    reportError(error, { route: '/api/admin/timeline', detail: 'Error fetching timeline data' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
