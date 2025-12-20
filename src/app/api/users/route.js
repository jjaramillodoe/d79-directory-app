const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../lib/auth');
const connectDB = require('../../../lib/mongodb');
const User = require('../../../models/User');

// GET /api/users - Fetch all users (admin only)
async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin (Level 4+)
    if (session.user.level < 4) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to database
    await connectDB();

    let users;
    
    if (session.user.level === 5) {
      // Super Admin can see all users
      users = await User.find({})
        .select('name email level schoolName title isActive createdAt lastLogin')
        .sort({ createdAt: -1 });
    } else {
      // Level 4 (Principal) can only see users from their school
      users = await User.find({ schoolName: session.user.schoolName })
        .select('name email level schoolName title isActive createdAt lastLogin')
        .sort({ createdAt: -1 });
    }

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT /api/users - Update user (admin only)
async function PUT(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin (Level 4+)
    if (session.user.level < 4) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { userId, level, schoolName, title, isActive } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to database
    await connectDB();

    // For Level 4 (Principal), check if they're trying to modify a user from their school
    if (session.user.level === 4) {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Principal can only modify users from their own school
      if (targetUser.schoolName !== session.user.schoolName) {
        return new Response(JSON.stringify({ error: 'Forbidden: You can only modify users from your school' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Principal cannot promote users to Level 4 or 5
      // Only Super Admins can create or promote users to Level 4-5
      if (level !== undefined && (level === 4 || level === 5)) {
        return new Response(JSON.stringify({ 
          error: 'Forbidden: You can only assign users to Level 1, 2, or 3. Only Super Admins can promote users to Level 4 or 5.' 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get the user before update for logging
    const userBeforeUpdate = await User.findById(userId);
    if (!userBeforeUpdate) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(level !== undefined && { level }),
        ...(schoolName !== undefined && { schoolName }),
        ...(title !== undefined && { title }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    ).select('name email level schoolName title isActive createdAt lastLogin');

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the update
    const changes = {};
    if (level !== undefined && level !== userBeforeUpdate.level) changes.level = `${userBeforeUpdate.level} -> ${level}`;
    if (schoolName !== undefined && schoolName !== userBeforeUpdate.schoolName) changes.schoolName = `${userBeforeUpdate.schoolName} -> ${schoolName}`;
    if (title !== undefined && title !== userBeforeUpdate.title) changes.title = `${userBeforeUpdate.title || 'none'} -> ${title || 'none'}`;
    if (isActive !== undefined && isActive !== userBeforeUpdate.isActive) changes.isActive = `${userBeforeUpdate.isActive} -> ${isActive}`;

    if (Object.keys(changes).length > 0) {
      const { logUserUpdated } = require('../../../lib/auditLogger');
      // Create a request-like object for logging
      const requestObj = {
        headers: Object.fromEntries(request.headers || []),
        ip: null,
        connection: { remoteAddress: null },
      };
      logUserUpdated(session.user, updatedUser, changes, requestObj).catch(err => 
        console.error('Error logging user update:', err)
      );
    }

    return new Response(JSON.stringify({ user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/users - Delete user (admin only)
async function DELETE(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin (Level 4+)
    if (session.user.level < 4) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { userId } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to database
    await connectDB();

    // For Level 4 (Principal), check if they're trying to delete a user from their school
    if (session.user.level === 4) {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Principal can only delete users from their own school
      if (targetUser.schoolName !== session.user.schoolName) {
        return new Response(JSON.stringify({ error: 'Forbidden: You can only delete users from your school' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get user before deletion for logging
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the deletion
    const { logUserDeleted } = require('../../../lib/auditLogger');
    // Create a request-like object for logging
    const requestObj = {
      headers: Object.fromEntries(request.headers || []),
      ip: null,
      connection: { remoteAddress: null },
    };
    logUserDeleted(session.user, deletedUser, requestObj).catch(err => 
      console.error('Error logging user deletion:', err)
    );

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

module.exports = { GET, PUT, DELETE };