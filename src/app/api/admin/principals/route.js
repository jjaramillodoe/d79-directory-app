import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
const { reportError } = require('../../../../lib/reportError');

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Level 4+ users can access this endpoint
    if (session.user.level < 4) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    // Build query based on user level
    let query = { level: 4 }; // Only Level 4 principals
    
    // If user is Level 4 (Principal), only show principals from their school
    if (session.user.level === 4) {
      query.schoolName = session.user.schoolName;
    }

    const principals = await User.find(query)
      .select('email name schoolName')
      .sort({ name: 1 })
      .limit(50); // Limit results for performance

    const suggestions = principals.map(principal => ({
      email: principal.email,
      name: principal.name,
      schoolName: principal.schoolName,
      displayText: `${principal.name} (${principal.email}) - ${principal.schoolName}`
    }));

    return NextResponse.json({ success: true, principals: suggestions });
  } catch (error) {
    reportError(error, { route: '/api/admin/principals', detail: 'Error fetching principals' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
