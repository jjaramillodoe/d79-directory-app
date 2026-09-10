import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import FormSubmission from '../../../../models/FormSubmission';
import User from '../../../../models/User';
import { reportError } from '../../../../lib/reportError';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }



    // Only Super Admins (Level 5) can transfer form ownership
    if (session.user.level !== 5) {
      return NextResponse.json({ 
        error: 'Only Super Admins can transfer form ownership' 
      }, { status: 403 });
    }

    const { formId, newOwnerEmail } = await request.json();

    if (!formId || !newOwnerEmail) {
      return NextResponse.json({ 
        error: 'Form ID and new owner email are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Find the form
    const form = await FormSubmission.findById(formId);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Find the new owner
    const newOwner = await User.findOne({ email: newOwnerEmail });
    if (!newOwner) {
      return NextResponse.json({
        error: 'New owner not found'
      }, { status: 404 });
    }

    // Verify the new owner is a Level 4 (Admin Principal)
    if (newOwner.level !== 4) {
      return NextResponse.json({
        error: 'New owner must be a Level 4 (Admin Principal) user'
      }, { status: 400 });
    }

    // Verify the new owner has required fields
    if (!newOwner.name || !newOwner.schoolName) {
      return NextResponse.json({
        error: 'New owner is missing required profile information (name or school)',
        details: `name: ${newOwner.name || 'missing'}, schoolName: ${newOwner.schoolName || 'missing'}`
      }, { status: 400 });
    }

    // Update the form ownership
    const oldOwnerId = form.userId;
    form.userId = newOwner._id;
    form.schoolName = newOwner.schoolName;
    form.principalName = newOwner.name;
    form.principalEmail = newOwner.email;
    
    // Get the current user from database to ensure valid ObjectId
    const currentUser = await User.findOne({
      $or: [
        { email: session.user.email },
        { _id: session.user.id || session.user._id }
      ]
    });

    if (!currentUser) {
      return NextResponse.json({
        error: 'Unable to identify current user for transfer history'
      }, { status: 400 });
    }

    const currentUserObjectId = currentUser._id;

    // Add transfer history
    if (!form.transferHistory) {
      form.transferHistory = [];
    }
    form.transferHistory.push({
      from: oldOwnerId,
      to: newOwner._id,
      transferredBy: currentUserObjectId,
      transferredAt: new Date(),
      reason: 'Super Admin transfer'
    });

    try {
      await form.save();
    } catch (saveError) {
      const errorInfo = {
        message: saveError.message,
        name: saveError.name,
        errors: saveError.errors ? Object.keys(saveError.errors).map(k => ({
          field: k,
          message: saveError.errors[k].message
        })) : [],
        formData: {
          id: form._id,
          userId: form.userId,
          schoolName: form.schoolName,
          principalEmail: form.principalEmail,
          principalName: form.principalName
        }
      };
      reportError(saveError, { route: '/api/forms/transfer-ownership', detail: 'Error saving form with transfer history', errorInfo });
      return NextResponse.json({
        error: 'Failed to save form transfer history',
        details: saveError.message,
        type: saveError.name,
        fields: saveError.errors ? Object.keys(saveError.errors) : []
      }, { status: 500 });
    }

    // Log activity for both users
    try {
      if (oldOwnerId) {
        const oldOwner = await User.findById(oldOwnerId);
        if (oldOwner) {
          oldOwner.activityLog.push({
            action: 'form_ownership_transferred',
            target: 'form',
            details: `Form transferred to ${newOwner.email} by ${session.user.email}`,
            timestamp: new Date()
          });
          oldOwner.lastActivity = new Date();
          await oldOwner.save();
        }
      }

      // Refresh newOwner to avoid version conflicts
      const refreshedNewOwner = await User.findById(newOwner._id);
      if (refreshedNewOwner) {
        refreshedNewOwner.activityLog.push({
          action: 'form_ownership_received',
          target: 'form',
          details: `Form ownership received from ${session.user.email}`,
          timestamp: new Date()
        });
        refreshedNewOwner.lastActivity = new Date();
        await refreshedNewOwner.save();
      }
    } catch (activityError) {
      reportError(activityError, { route: '/api/forms/transfer-ownership', detail: 'Error logging activity' });
      // Don't fail the entire operation if activity logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: `Form ownership transferred to ${newOwner.name}`,
      form: {
        id: form._id,
        schoolName: form.schoolName,
        principalName: form.principalName,
        principalEmail: form.principalEmail
      }
    });

  } catch (error) {
    reportError(error, { route: '/api/forms/transfer-ownership', detail: 'Error transferring form ownership' });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admins can view transfer history
    if (session.user.level !== 5) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 });
    }

    await connectDB();

    // Get all forms with transfer history
    const forms = await FormSubmission.find({ 
      'transferHistory.0': { $exists: true } 
    })
    .populate('userId', 'name email level schoolName')
    .populate('transferHistory.from', 'name email')
    .populate('transferHistory.to', 'name email')
    .populate('transferHistory.transferredBy', 'name email')
    .sort({ 'transferHistory.transferredAt': -1 });

    return NextResponse.json({ forms });

  } catch (error) {
    reportError(error, { route: '/api/forms/transfer-ownership', detail: 'Error fetching transfer history' });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
