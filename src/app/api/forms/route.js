const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../lib/auth');
const connectDB = require('../../../lib/mongodb');
const FormSubmission = require('../../../models/FormSubmission');
const FormComment = require('../../../models/FormComment');
const User = require('../../../models/User');

// GET /api/forms - Get user's forms or all forms (for admins)
async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let forms;
    
    if (user.level === 5) {
      // Super Admin can see all forms
      forms = await FormSubmission.find({})
        .populate('userId', 'name email level')
        .populate('reviewedBy', 'name email')
        .sort({ updatedAt: -1 });
      
      // Add collaboration info and user permissions for each form
      forms = await Promise.all(forms.map(async (form) => {
        const formObj = form.toObject();
        
        // Check if form has Level 3 collaborators with their permissions
        const level3Users = await User.find({
          level: 3,
          'assignedForms.formId': form._id
        }).select('name email assignedForms');
        
        // Extract Level 3 collaborators with their permissions
        const level3Collaborators = level3Users.map(level3User => {
          const assignment = level3User.assignedForms.find(
            a => a.formId.toString() === form._id.toString()
          );
          return {
            name: level3User.name,
            email: level3User.email,
            permissions: assignment?.permissions || 'edit' // Level 3 should always have edit
          };
        });
        
        // Determine current user's permission for this form
        const formUserId = form.userId?._id?.toString() || form.userId?.toString();
        const isOwner = formUserId === user._id.toString();
        const userPermission = isOwner ? 'owner' : 'edit'; // Super admins can edit all
        
        // Fetch all active comments for this form
        const formComments = await FormComment.find({ 
          formId: form._id, 
          isActive: true 
        })
          .populate('reviewedBy', 'name email')
          .sort({ reviewedAt: -1 })
          .lean();
        
        // Get the most recent comment for backward compatibility
        const latestComment = formComments.length > 0 ? formComments[0] : null;
        
        return {
          ...formObj,
          hasLevel3Collaborators: level3Collaborators.length > 0,
          level3CollaboratorCount: level3Collaborators.length,
          level3Collaborators: level3Collaborators, // Full list with permissions
          userPermission: userPermission,
          comments: formComments, // All comments
          reviewComments: latestComment?.comment || formObj.reviewComments, // Latest comment for backward compatibility
          reviewedBy: latestComment?.reviewedBy || formObj.reviewedBy, // Latest reviewer for backward compatibility
          reviewedAt: latestComment?.reviewedAt || formObj.reviewedAt // Latest review date for backward compatibility
        };
      }));
    } else if (user.level === 4) {
      // Admin Principal can see forms from their school and forms they've assigned
      const schoolForms = await FormSubmission.find({ schoolName: user.schoolName })
        .populate('userId', 'name email level')
        .populate('reviewedBy', 'name email')
        .sort({ updatedAt: -1 });
      
      // Also include forms they've assigned to others
      const assignedForms = await FormSubmission.find({
        _id: { $in: user.assignedForms.map(assignment => assignment.formId) }
      }).populate('userId', 'name email level');
      
      // Combine and deduplicate
      const allForms = [...schoolForms, ...assignedForms];
      const uniqueForms = allForms.filter((form, index, self) => 
        index === self.findIndex(f => f._id.toString() === form._id.toString())
      );
      
      // Fetch comments for all forms
      forms = await Promise.all(uniqueForms.map(async (form) => {
        const formObj = form.toObject();
        const formComments = await FormComment.find({ 
          formId: form._id, 
          isActive: true 
        })
          .populate('reviewedBy', 'name email')
          .sort({ reviewedAt: -1 })
          .lean();
        
        const latestComment = formComments.length > 0 ? formComments[0] : null;
        
        return {
          ...formObj,
          comments: formComments,
          reviewComments: latestComment?.comment || formObj.reviewComments,
          reviewedBy: latestComment?.reviewedBy || formObj.reviewedBy,
          reviewedAt: latestComment?.reviewedAt || formObj.reviewedAt
        };
      }));
    } else if (user.level === 3) {
      // Level 3 (Assistant Principal) can ONLY see forms assigned to them by the principal
      // They cannot see their own forms (they can't create forms anyway)
      const assignedFormIds = user.assignedForms.map(assignment => assignment.formId);
      
      if (assignedFormIds.length === 0) {
        forms = [];
      } else {
        forms = await FormSubmission.find({
          _id: { $in: assignedFormIds }
        })
        .populate('userId', 'name email level')
        .populate('reviewedBy', 'name email')
        .sort({ updatedAt: -1 });
        
        // Add collaboration info and comments to each form
        forms = await Promise.all(forms.map(async (form) => {
          const formObj = form.toObject();
          const assignment = user.assignedForms.find(a => a.formId.toString() === form._id.toString());
          
          const formComments = await FormComment.find({ 
            formId: form._id, 
            isActive: true 
          })
            .populate('reviewedBy', 'name email')
            .sort({ reviewedAt: -1 })
            .lean();
          
          const latestComment = formComments.length > 0 ? formComments[0] : null;
          
          return {
            ...formObj,
            isShared: true, // All forms for Level 3 are shared/assigned
            collaborationPermissions: assignment ? assignment.permissions : null,
            assignedSections: assignment ? assignment.assignedSections : [],
            assignedAt: assignment ? assignment.assignedAt : null,
            comments: formComments,
            reviewComments: latestComment?.comment || formObj.reviewComments,
            reviewedBy: latestComment?.reviewedBy || formObj.reviewedBy,
            reviewedAt: latestComment?.reviewedAt || formObj.reviewedAt
          };
        }));
      }
    } else if (user.level === 2) {
      // Level 2 users can see forms from their school (similar to Level 4), their own forms, and forms shared with them
      const schoolForms = await FormSubmission.find({ schoolName: user.schoolName })
        .populate('userId', 'name email level')
        .populate('reviewedBy', 'name email')
        .sort({ updatedAt: -1 });
      
      // Also include their own forms
      const ownForms = await FormSubmission.find({ userId: user._id })
        .populate('userId', 'name email level')
        .populate('reviewedBy', 'name email');
      
      // Get forms shared with this user
      const sharedForms = await FormSubmission.find({
        _id: { $in: user.assignedForms.map(assignment => assignment.formId) }
      })
        .populate('userId', 'name email level')
        .populate('reviewedBy', 'name email');
      
      // Combine and deduplicate forms
      const allForms = [...schoolForms, ...ownForms, ...sharedForms];
      const uniqueForms = allForms.filter((form, index, self) => 
        index === self.findIndex(f => f._id.toString() === form._id.toString())
      );
      
      // Fetch comments for all forms
      forms = await Promise.all(uniqueForms.map(async (form) => {
        const formObj = form.toObject();
        const formComments = await FormComment.find({ 
          formId: form._id, 
          isActive: true 
        })
          .populate('reviewedBy', 'name email')
          .sort({ reviewedAt: -1 })
          .lean();
        
        const latestComment = formComments.length > 0 ? formComments[0] : null;
        
        return {
          ...formObj,
          comments: formComments,
          reviewComments: latestComment?.comment || formObj.reviewComments,
          reviewedBy: latestComment?.reviewedBy || formObj.reviewedBy,
          reviewedAt: latestComment?.reviewedAt || formObj.reviewedAt
        };
      }));
      
      forms = forms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else {
      // Level 1 users can see their own forms AND forms shared with them
      const ownForms = await FormSubmission.find({ userId: user._id });
      
      // Get forms shared with this user
      const sharedForms = await FormSubmission.find({
        _id: { $in: user.assignedForms.map(assignment => assignment.formId) }
      });
      
      // Combine and deduplicate forms
      const allForms = [...ownForms, ...sharedForms];
      const uniqueForms = allForms.filter((form, index, self) => 
        index === self.findIndex(f => f._id.toString() === form._id.toString())
      );
      
      forms = uniqueForms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // Populate user data for all forms
      forms = await FormSubmission.populate(forms, { path: 'userId', select: 'name email level' });
      
      // Add collaboration info and comments to each form
      forms = await Promise.all(forms.map(async (form) => {
        const formObj = form.toObject();
        const assignment = user.assignedForms.find(a => a.formId.toString() === form._id.toString());
        
        const formComments = await FormComment.find({ 
          formId: form._id, 
          isActive: true 
        })
          .populate('reviewedBy', 'name email')
          .sort({ reviewedAt: -1 })
          .lean();
        
        const latestComment = formComments.length > 0 ? formComments[0] : null;
        
        return {
          ...formObj,
          isShared: !!assignment,
          collaborationPermissions: assignment ? assignment.permissions : null,
          assignedSections: assignment ? assignment.assignedSections : [],
          assignedAt: assignment ? assignment.assignedAt : null,
          comments: formComments,
          reviewComments: latestComment?.comment || formObj.reviewComments,
          reviewedBy: latestComment?.reviewedBy || formObj.reviewedBy,
          reviewedAt: latestComment?.reviewedAt || formObj.reviewedAt
        };
      }));
    }

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/forms - Create new form
async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to create forms (Level 4+)
    if (user.level < 4) {
      return NextResponse.json({ error: 'Insufficient permissions. Only Admin Principals (Level 4) and Super Admins (Level 5) can create forms.' }, { status: 403 });
    }

    const { schoolName, initialOwnerEmail } = await request.json();

    if (!schoolName || !schoolName.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }

    let formOwner = user;
    let principalEmail = user.email;
    let principalName = user.name;

    // If super admin is creating a form for someone else
    if (user.level === 5 && initialOwnerEmail && initialOwnerEmail !== user.email) {
      const initialOwner = await User.findOne({ email: initialOwnerEmail });
      if (!initialOwner) {
        return NextResponse.json({ error: 'Initial owner not found' }, { status: 404 });
      }
      
      // Verify the initial owner is a Level 4 (Admin Principal)
      if (initialOwner.level !== 4) {
        return NextResponse.json({ 
          error: 'Initial owner must be a Level 4 (Admin Principal) user' 
        }, { status: 400 });
      }

      formOwner = initialOwner;
      principalEmail = initialOwner.email;
      principalName = initialOwner.name;
    }

    // Create new form submission
    const newForm = new FormSubmission({
      userId: formOwner._id,
      schoolName: schoolName.trim(),
      principalEmail: principalEmail,
      principalName: principalName,
      status: 'draft',
      currentStep: 1,
      createdBy: user._id, // Track who actually created it
    });

    // If this is a super admin creating for someone else, add transfer history
    if (user.level === 5 && initialOwnerEmail && initialOwnerEmail !== user.email) {
      newForm.transferHistory = [{
        from: user._id,
        to: formOwner._id,
        transferredBy: user._id,
        transferredAt: new Date(),
        reason: 'Initial creation by Super Admin'
      }];
    }

    await newForm.save();

    // Automatically assign the form owner with 'edit' permissions
    // This ensures principals can always edit their own forms
    const existingAssignment = formOwner.assignedForms.find(
      assignment => assignment.formId.toString() === newForm._id.toString()
    );

    if (!existingAssignment) {
      formOwner.assignedForms.push({
        formId: newForm._id,
        assignedBy: user._id, // The creator (could be super admin or the principal themselves)
        permissions: 'edit',
        assignedAt: new Date(),
        assignedSections: [] // Empty array means all sections
      });
      await formOwner.save();
    } else if (existingAssignment.permissions !== 'edit') {
      // Update existing assignment to ensure it has 'edit' permissions
      existingAssignment.permissions = 'edit';
      await formOwner.save();
    }

    return NextResponse.json({ 
      success: true, 
      formId: newForm._id.toString(),
      message: 'Form created successfully' 
    });
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export named exports for Next.js 16 (ES module syntax)
export { GET, POST };