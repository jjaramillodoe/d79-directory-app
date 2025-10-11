const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../lib/auth');
const connectDB = require('../../../../lib/mongodb');
const FormSubmission = require('../../../../models/FormSubmission');
const User = require('../../../../models/User');

// GET /api/forms/[id] - Get specific form
async function GET(request, { params }) {
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

    const { id } = await params;
    const form = await FormSubmission.findById(id)
      .populate('userId', 'name email level')
      .populate('reviewedBy', 'name email');

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check permissions: owner can access their form, super admins can access any form, or user has been assigned the form
    const isOwner = form.userId._id.toString() === user._id.toString();
    const isSuperAdmin = user.level === 5;
    const isAssigned = user.assignedForms.some(assignment => 
      assignment.formId.toString() === form._id.toString()
    );
    
    if (!isOwner && !isSuperAdmin && !isAssigned) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Add collaboration information if user is assigned to this form
    let collaborationInfo = null;
    if (isAssigned) {
      const assignment = user.assignedForms.find(a => a.formId.toString() === form._id.toString());
      collaborationInfo = {
        permissions: assignment.permissions,
        assignedSections: assignment.assignedSections,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy
      };
    }

    return NextResponse.json({ form, collaborationInfo });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/forms/[id] - Update form data
async function PUT(request, { params }) {
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

    const { id } = await params;
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check permissions: owner can edit their draft/submitted forms, super admins can edit any form, or user has edit permissions
    const isOwner = form.userId.toString() === user._id.toString();
    const isSuperAdmin = user.level === 5;
    const assignment = user.assignedForms.find(a => a.formId.toString() === form._id.toString());
    const hasEditAccess = assignment && assignment.permissions === 'edit';
    
    if (!isOwner && !isSuperAdmin && !hasEditAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData = await request.json();
    const { step, stepData, currentStep, action } = updateData;

    // Shared step mapping for consistent step numbering - NOTE: principalLetter removed
    const stepNumberMap = {
      'tableOfContents': 1,
      'childAbuseIntervention': 2,
      'sexualHarassment': 3,
      'respectForAll': 4,
      'suicidePrevention': 5,
      'attendancePlan': 6,
      'temporaryHousing': 7,
      'serviceInSchools': 8,
      'planningInterviews': 9,
      'militaryRecruitment': 10,
      'schoolCulture': 11,
      'afterSchoolPrograms': 12,
      'cellPhonePolicy': 13,
      'counselingPlan': 14
    };

    // Handle different update actions
    if (action === 'save_step' && step && stepData) {
      // Save specific step data - NOTE: principalLetter has been removed
      const stepNames = [
        'tableOfContents', 'childAbuseIntervention', 
        'sexualHarassment', 'respectForAll', 'suicidePrevention',
        'attendancePlan', 'temporaryHousing', 'serviceInSchools',
        'planningInterviews', 'militaryRecruitment', 'schoolCulture',
        'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
      ];

      const stepKey = stepNames[step - 1];
      
      if (stepKey) {
        // Check if step has meaningful data
        const hasData = stepData.data && Object.keys(stepData.data).length > 0;
        const isCompleted = hasData && stepData.completed;
        
        // Initialize step if it doesn't exist
        if (!form.formData[stepKey]) {
          form.formData[stepKey] = {
            completed: false,
            data: {},
            startedAt: null,
            lastUpdated: null,
            timeSpent: 0,
            revisionCount: 0
          };
        }
        
        // Update step data - ensure boolean values are preserved
        form.formData[stepKey].completed = isCompleted;
        form.formData[stepKey].data = stepData.data || {};
        
        // Update metadata
        if (hasData) {
          if (!form.formData[stepKey].startedAt) {
            form.formData[stepKey].startedAt = new Date();
          }
          form.formData[stepKey].lastUpdated = new Date();
          
          // Increment revision count if data actually changed
          const oldData = JSON.stringify(form.formData[stepKey].data);
          const newData = JSON.stringify(stepData.data);
          if (oldData !== newData) {
            form.formData[stepKey].revisionCount = (form.formData[stepKey].revisionCount || 0) + 1;
          }
        }

        // Update completed steps array - use correct step mapping
        const completedSteps = Object.keys(form.formData)
          .filter(key => form.formData[key]?.completed)
          .map(key => stepNumberMap[key])
          .filter(stepNumber => stepNumber !== undefined)
          .sort((a, b) => a - b);
        
        form.completedSteps = completedSteps;
      }
    }

    // Update current step if provided
    if (currentStep && currentStep >= 1 && currentStep <= 14) {
      form.currentStep = currentStep;
    }

    // Handle form submission
    if (action === 'submit') {
      form.status = 'submitted';
      form.submittedAt = new Date();
      
      // If complete form data is provided, update all steps
      if (updateData.formData) {
        const stepNames = [
          'tableOfContents', 'childAbuseIntervention', 
          'sexualHarassment', 'respectForAll', 'suicidePrevention',
          'attendancePlan', 'temporaryHousing', 'serviceInSchools',
          'planningInterviews', 'militaryRecruitment', 'schoolCulture',
          'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
        ];

        // Update all step data
        stepNames.forEach(stepKey => {
          if (updateData.formData[stepKey]) {
            form.formData[stepKey] = {
              completed: updateData.formData[stepKey].completed || false,
              data: updateData.formData[stepKey].data || {},
            };
          }
        });

        // Mark all steps as completed if they have data
        stepNames.forEach(stepKey => {
          if (form.formData[stepKey]?.data && Object.keys(form.formData[stepKey].data).length > 0) {
            form.formData[stepKey].completed = true;
          }
        });
      }

      // Update completed steps array - use correct step mapping
      const completedSteps = Object.keys(form.formData)
        .filter(stepKey => form.formData[stepKey]?.completed)
        .map(stepKey => stepNumberMap[stepKey])
        .filter(stepNumber => stepNumber !== undefined)
        .sort((a, b) => a - b);
      form.completedSteps = completedSteps;
    }

    // Handle admin actions (Super Admin only)
    if (user.level === 5 && action === 'review') {
      const { status, comments } = updateData;
      if (['approved', 'rejected', 'under_review'].includes(status)) {
        form.status = status;
        form.reviewedBy = user._id;
        form.reviewedAt = new Date();
        if (comments) {
          form.reviewComments = comments;
        }
        
        // Mark notification as sent for reviewed submissions
        if (['approved', 'rejected'].includes(status)) {
          form.notificationSent = true;
          form.notificationSentAt = new Date();
        }
      }
    }

    await form.save();

    return NextResponse.json({ 
      success: true, 
      form,
      message: 'Form updated successfully' 
    });
  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/forms/[id] - Delete form (admin only)
async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.level !== 5) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await FormSubmission.findByIdAndDelete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'Form deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

module.exports = { GET, PUT, DELETE };