import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import FormSubmission from '../../../../models/FormSubmission';
import User from '../../../../models/User';
import { schoolScopeFilter } from '../../../../lib/userAccess';
import { reportError } from '../../../../lib/reportError';

// POST /api/admin/reports - Generate CSV report
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.isActive === false || user.level < 4) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { startDate, endDate, status } = await request.json();

    // Principals only ever export their own school; Super Admins get the district.
    const query = { ...schoolScopeFilter(user) };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Fetch submissions
    const submissions = await FormSubmission.find(query)
      .populate('userId', 'name email level')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    // Generate CSV content
    const csvHeaders = [
      'School Name',
      'Principal Name',
      'Principal Email',
      'Status',
      'Current Step',
      'Completed Steps',
      'Progress %',
      'Submitted Date',
      'Reviewed By',
      'Review Date',
      'Review Comments',
      'Created Date',
      'Last Updated'
    ];

    const csvRows = submissions.map(submission => {
      const completedSteps = submission.completedSteps || [];
      const progress = Math.round((completedSteps.length / 15) * 100);
      
      return [
        submission.schoolName || '',
        submission.principalName || '',
        submission.principalEmail || '',
        submission.status || '',
        submission.currentStep || '',
        completedSteps.join(', '),
        `${progress}%`,
        submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '',
        submission.reviewedBy?.name || '',
        submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleDateString() : '',
        submission.reviewComments || '',
        submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '',
        submission.updatedAt ? new Date(submission.updatedAt).toLocaleDateString() : ''
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="submissions-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    reportError(error, { route: '/api/admin/reports', detail: 'Error generating report' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
