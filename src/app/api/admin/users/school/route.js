import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET: Get all users from the principal's school
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only principals (level 4) can access this endpoint
    if (session.user.level < 4) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // For Level 5 (Super Admin), get all Level 3 users from all schools
    // For Level 4 (Principal), get users from their school only
    let users;
    if (session.user.level === 5) {
      // Super Admin can see all Level 3 users from all schools
      users = await User.find({ 
        level: 3,
        isActive: true 
      }).sort({ schoolName: 1, name: 1 });
    } else {
      // Level 4 users see only their school
      users = await User.findBySchool(session.user.schoolName, {
        includeInactive: true // Include inactive users for management
      });
    }

    // Format user data for the frontend
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      level: user.level,
      title: user.title,
      schoolName: user.schoolName,
      isActive: user.isActive,
      canCollaborate: user.canCollaborate,
      collaborationLevel: user.collaborationLevel,
      lastLogin: user.lastLogin,
      lastActivity: user.lastActivity,
      assignedFormsCount: user.assignedForms.length,
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (error) {
    console.error('Error fetching school users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: Create a new user for the school
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only principals (level 4) can create users
    if (session.user.level < 4) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, title, level = 3, canCollaborate = true, collaborationLevel = 'edit' } = body;

    // Level 4 (Principal) users can only create Level 1-3 users
    // Only Level 5 (Super Admin) can create Level 4-5 users
    if (session.user.level === 4 && (level === 4 || level === 5)) {
      return NextResponse.json(
        { error: 'You can only create users with Level 1, 2, or 3. Only Super Admins can create Level 4 or 5 users.' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!name || !email || !title) {
      return NextResponse.json(
        { error: 'Name, email, and title are required' },
        { status: 400 }
      );
    }

    // Validate email domain
    if (!email.endsWith('@schools.nyc.gov')) {
      return NextResponse.json(
        { error: 'Only @schools.nyc.gov emails are allowed' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      title,
      level,
      schoolName: session.user.schoolName, // Same school as principal
      canCollaborate,
      collaborationLevel,
      isActive: true
    });

    await newUser.save();

    // Log the activity
    await newUser.logActivity('user_created', session.user.email, `Created by ${session.user.name}`);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        title: newUser.title,
        level: newUser.level,
        schoolName: newUser.schoolName,
        isActive: newUser.isActive,
        canCollaborate: newUser.canCollaborate,
        collaborationLevel: newUser.collaborationLevel
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
