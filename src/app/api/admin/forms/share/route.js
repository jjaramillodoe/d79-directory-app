import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import FormSubmission from '../../../../../models/FormSubmission';
import { clientSafeMessage } from '../../../../../lib/userAccess';
import { reportError } from '../../../../../lib/reportError';
import { buildShareList } from '../../../../../lib/formShares';

const SHARE_USER_FIELDS = 'name email title level schoolName isActive assignedForms';

// Forms with any share in the admin's scope (Level 4: own school; Level 5: all).
async function listShares(sessionUser) {
  const level = Number(sessionUser.level);
  const scope = level === 5 ? {} : { schoolName: sessionUser.schoolName };

  const assignees = await User.find({ 'assignedForms.0': { $exists: true } })
    .select(SHARE_USER_FIELDS)
    .populate('assignedForms.assignedBy', 'name email')
    .lean();
  const assignedFormIds = new Set(
    assignees.flatMap((u) => (u.assignedForms || []).map((a) => String(a.formId)))
  );

  const forms = await FormSubmission.find({
    ...scope,
    $or: [
      { _id: { $in: [...assignedFormIds] } },
      { 'sharedWithEmails.0': { $exists: true } },
    ],
  })
    .select('schoolName schoolYear status userId principalEmail sharedWithEmails createdAt')
    .populate('sharedWithEmails.sharedBy', 'name email')
    .lean();

  const sharedEmails = [
    ...new Set(forms.flatMap((f) => (f.sharedWithEmails || []).map((s) => String(s.email).toLowerCase()))),
  ];
  const emailUsers = sharedEmails.length
    ? await User.find({ email: { $in: sharedEmails } }).select(SHARE_USER_FIELDS).lean()
    : [];

  return buildShareList(forms, assignees, emailUsers);
}

// POST: Share a form with users for collaboration
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only principals (level 4) and super admins (level 5) can share forms
    if (session.user.level < 4) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { formId, userIds, permissions = 'edit', sections = [] } = body;

    // Validate required fields
    if (!formId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Form ID and user IDs are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the form exists and belongs to the principal's school
    const form = await FormSubmission.findById(formId);
    if (!form) {
      console.error('Form not found:', formId);
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // For level 4 (principals), verify the form is from their school
    // Level 5 (super admins) can share any form
    if (session.user.level === 4 && form.schoolName !== session.user.schoolName) {
      return NextResponse.json({ error: 'Form not found in your school' }, { status: 404 });
    }

    // Get all users to be assigned
    // For Level 5 (super admins), allow sharing with users from any school
    // For Level 4 (principals), only allow sharing with users from their school
    const userQuery = {
      _id: { $in: userIds },
      isActive: true
    };
    
    if (session.user.level === 4) {
      userQuery.schoolName = session.user.schoolName;
    }
    
    const users = await User.find(userQuery);

    if (users.length !== userIds.length) {
      const foundUserIds = users.map(u => u._id.toString());
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      console.error('Some users not found:', { requested: userIds, found: foundUserIds, missing: missingUserIds });
      
      return NextResponse.json(
        { 
          error: session.user.level === 5 
            ? 'Some users not found or inactive' 
            : 'Some users not found or not in your school',
          missingUserIds
        },
        { status: 400 }
      );
    }

    // Assign forms to users
    const assignmentResults = [];
    
    for (const user of users) {
      try {
        // Level 3 users (Assistant Principals) should always have 'edit' permissions when assigned
        const userPermissions = user.level === 3 ? 'edit' : permissions;
        
        await user.assignForm(formId, session.user.id, userPermissions, sections);
        
        // Log the activity
        await user.logActivity(
          'form_assigned', 
          formId, 
          `Form shared by ${session.user.name} with ${permissions} permissions`
        );

        assignmentResults.push({
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          success: true
        });
      } catch (error) {
        console.error(`Error assigning form to user ${user.email}:`, error);
        assignmentResults.push({
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          success: false,
          error: clientSafeMessage(error, 'Could not assign this form.')
        });
      }
    }

    // Log the principal's activity
    const principal = await User.findById(session.user.id);
    if (principal) {
      await principal.logActivity(
        'form_shared',
        formId,
        `Shared form with ${userIds.length} users`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Form shared with ${userIds.length} users`,
      assignments: assignmentResults
    });

  } catch (error) {
    reportError(error, { route: '/api/admin/forms/share', detail: 'Error sharing form' });
    return NextResponse.json(
      { error: 'Failed to share form' },
      { status: 500 }
    );
  }
}

// GET: Get collaboration details for a form
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      // No form given: list everyone each in-scope form is shared with.
      if (session.user.level < 4) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      await connectDB();
      return NextResponse.json({ success: true, shares: await listShares(session.user) });
    }

    await connectDB();

    // Get the form
    const form = await FormSubmission.findById(formId);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check if user has access to this form
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Principals only inspect their own school's plan; Super Admins can inspect any.
    if (Number(user.level) < 5 && form.schoolName !== user.schoolName) {
      return NextResponse.json({ error: 'Form not found in your school' }, { status: 404 });
    }

    // Principals can see all collaborations, users can only see their own
    let collaborationQuery = {};
    
    if (session.user.level < 4) {
      // Regular user - only show their own assignments
      collaborationQuery = { _id: session.user.id };
    } else {
      // Principal - show all users assigned to this form
      collaborationQuery = { 'assignedForms.formId': formId };
    }

    const collaboratingUsers = await User.find(collaborationQuery)
      .select('name email title assignedForms')
      .populate('assignedForms.assignedBy', 'name email');

    // Format collaboration data
    const collaborations = collaboratingUsers.map(user => {
      const formAssignment = user.assignedForms.find(
        assignment => assignment.formId.toString() === formId
      );
      
      return {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        title: user.title,
        permissions: formAssignment?.permissions || 'none',
        assignedSections: formAssignment?.assignedSections || [],
        assignedAt: formAssignment?.assignedAt,
        assignedBy: formAssignment?.assignedBy ? {
          name: formAssignment.assignedBy.name,
          email: formAssignment.assignedBy.email
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      form: {
        id: form._id.toString(),
        schoolName: form.schoolName,
        status: form.status
      },
      collaborations
    });

  } catch (error) {
    reportError(error, { route: '/api/admin/forms/share', detail: 'Error fetching form collaborations' });
    return NextResponse.json(
      { error: 'Failed to fetch collaborations' },
      { status: 500 }
    );
  }
}

// DELETE: Unshare a form.
//   { formId }          removes every user assignment (and, for Super Admins, every email share)
//   { formId, userId }  removes one user's assignment
//   { formId, email }   removes one email share (Super Admins only, matching /api/forms/[id]/share)
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only principals (level 4) and super admins (level 5) can unshare forms
    if (session.user.level < 4) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const formId = body?.formId ? String(body.formId) : '';
    const userId = body?.userId ? String(body.userId) : '';
    const email = body?.email ? String(body.email).trim().toLowerCase() : '';

    // Validate required fields
    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the form exists
    const form = await FormSubmission.findById(formId);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // For level 4 (principals), verify they own this form
    if (session.user.level === 4 && form.schoolName !== session.user.schoolName) {
      return NextResponse.json({ error: 'Unauthorized - form not in your school' }, { status: 403 });
    }

    if (email) {
      if (Number(session.user.level) !== 5) {
        return NextResponse.json({ error: 'Only Super Admins can remove email shares' }, { status: 403 });
      }
      const before = form.sharedWithEmails.length;
      form.sharedWithEmails = form.sharedWithEmails.filter((share) => share.email !== email);
      const removedCount = before - form.sharedWithEmails.length;
      if (!removedCount) {
        return NextResponse.json({ error: 'That email is not on this form' }, { status: 404 });
      }
      await form.save();
      return NextResponse.json({ success: true, message: `Removed ${email}`, removedCount });
    }

    if (userId) {
      const target = await User.findOne({ _id: userId, 'assignedForms.formId': formId });
      if (!target) {
        return NextResponse.json({ error: 'That user is not shared on this form' }, { status: 404 });
      }
      await target.removeFormAssignment(formId);
      await target.logActivity('form_unshared', formId, `Access removed by ${session.user.name}`);
      const principal = await User.findById(session.user.id);
      if (principal) {
        await principal.logActivity('form_unshared', formId, `Removed ${target.email} from form`);
      }
      return NextResponse.json({ success: true, message: `Removed ${target.name || target.email}`, removedCount: 1 });
    }

    // Super Admins clearing a form also clear its email shares.
    let removedEmails = 0;
    if (Number(session.user.level) === 5 && form.sharedWithEmails?.length) {
      removedEmails = form.sharedWithEmails.length;
      form.sharedWithEmails = [];
      await form.save();
    }

    // Find all users who have this form assigned
    const usersWithForm = await User.find({ 'assignedForms.formId': formId });

    let removedCount = 0;
    for (const user of usersWithForm) {
      try {
        // Remove the form from user's assignedForms
        user.assignedForms = user.assignedForms.filter(
          assignment => assignment.formId.toString() !== formId
        );
        await user.save();

        // Log the activity
        await user.logActivity(
          'form_unshared',
          formId,
          `Form unshared by ${session.user.name}`
        );

        removedCount++;
      } catch (error) {
        console.error(`Error removing form from user ${user.email}:`, error);
      }
    }

    // Log the principal's activity
    const principal = await User.findById(session.user.id);
    if (principal) {
      await principal.logActivity(
        'form_unshared',
        formId,
        `Unshared form from ${removedCount} users`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Form unshared. Removed ${removedCount} user(s)${removedEmails ? ` and ${removedEmails} email share(s)` : ''}.`,
      removedCount,
      removedEmails
    });

  } catch (error) {
    reportError(error, { route: '/api/admin/forms/share', detail: 'Error unsharing form' });
    return NextResponse.json(
      { error: 'Failed to unshare form' },
      { status: 500 }
    );
  }
}
