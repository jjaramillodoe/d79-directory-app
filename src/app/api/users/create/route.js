const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../lib/auth');
const connectDB = require('../../../../lib/mongodb');
const User = require('../../../../models/User');

// POST /api/users/create - Create new user (admin only)
async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin (Level 4)
    if (session.user.level < 4) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, email, level, schoolName, title, isActive } = await request.json();

    // Level 4 (Principal) users can only create Level 1-3 users
    // Only Level 5 (Super Admin) can create Level 4-5 users
    if (session.user.level === 4 && level !== undefined && (level === 4 || level === 5)) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: You can only create users with Level 1, 2, or 3. Only Super Admins can create Level 4 or 5 users.' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if email ends with @schools.nyc.gov
    if (!email.endsWith('@schools.nyc.gov')) {
      return new Response(JSON.stringify({ error: 'Email must be from @schools.nyc.gov domain' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User with this email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      level: level || 3,
      schoolName: schoolName || '',
      title: title || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    // Log the user creation
    const { logUserCreated } = require('../../../../lib/auditLogger');
    // Create a request-like object for logging
    const requestObj = {
      headers: Object.fromEntries(request.headers || []),
      ip: null,
      connection: { remoteAddress: null },
    };
    logUserCreated(session.user, newUser, requestObj).catch(err => 
      console.error('Error logging user creation:', err)
    );

    return new Response(JSON.stringify({ 
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        level: newUser.level,
        schoolName: newUser.schoolName,
        title: newUser.title,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

module.exports = { POST };