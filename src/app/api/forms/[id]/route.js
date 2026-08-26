const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../lib/auth');
const connectDB = require('../../../../lib/mongodb');
const FormSubmission = require('../../../../models/FormSubmission');
const FormComment = require('../../../../models/FormComment');
const User = require('../../../../models/User');
const { getPublishedOrJson } = require('../../../../lib/questionBank');
const { getStepKeys, getStepNumberByKey } = require('../../../../lib/formSteps');
const { inferSchoolYear } = require('../../../../lib/schoolYear');
const { describeFormAccess, canEditForm } = require('../../../../lib/formAccess');
const { reportError } = require('../../../../lib/reportError');

// GET /api/forms/[id] - Get specific form
async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch user with retry logic for database connection issues
    let user;
    let userRetryCount = 0;
    const maxUserRetries = 3;
    
    while (userRetryCount <= maxUserRetries) {
      try {
        user = await User.findOne({ email: session.user.email });
        if (user) break; // Success, exit retry loop
        
        if (userRetryCount === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
      } catch (userError) {
        const isConnectionError = userError.name === 'MongoNetworkError' || 
                                 userError.name === 'MongoServerSelectionError' ||
                                 userError.message?.includes('connection') ||
                                 userError.message?.includes('timeout');
        
        if (isConnectionError && userRetryCount < maxUserRetries) {
          userRetryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * userRetryCount));
          continue;
        }
        
        reportError(userError, { route: '/api/forms/[id]', detail: 'Error fetching user in GET' });
        return NextResponse.json({ 
          error: 'Database connection error',
          message: 'Unable to verify user. Please try again in a moment.',
          retryable: true
        }, { status: 503 });
      }
      userRetryCount++;
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    
    // Validate form ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }
    
    // Fetch form with retry logic
    let form;
    let formRetryCount = 0;
    const maxFormRetries = 3;
    
    while (formRetryCount <= maxFormRetries) {
      try {
        form = await FormSubmission.findById(id)
          .populate('userId', 'name email level')
          .populate('reviewedBy', 'name email');
        if (form) break; // Success, exit retry loop
        
        if (formRetryCount === 0) {
          return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }
      } catch (formError) {
        const isConnectionError = formError.name === 'MongoNetworkError' || 
                                 formError.name === 'MongoServerSelectionError' ||
                                 formError.message?.includes('connection') ||
                                 formError.message?.includes('timeout');
        
        if (isConnectionError && formRetryCount < maxFormRetries) {
          formRetryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * formRetryCount));
          continue;
        }
        
        reportError(formError, { route: '/api/forms/[id]', detail: 'Error fetching form in GET' });
        return NextResponse.json({ 
          error: 'Database connection error',
          message: 'Unable to load form. Please try again in a moment.',
          retryable: true
        }, { status: 503 });
      }
      formRetryCount++;
    }
    
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const access = describeFormAccess(user, form);
    if (!access.canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const collaborationInfo = access.assignment
      ? {
          permissions: access.assignment.permissions,
          assignedSections: access.assignment.assignedSections,
          assignedAt: access.assignment.assignedAt,
          assignedBy: access.assignment.assignedBy,
        }
      : null;

    const userPermission = access.permission;

    // Fetch all active comments for this form (wrap in try-catch to prevent breaking form load)
    let comments = [];
    try {
      comments = await FormComment.find({ 
        formId: form._id, 
        isActive: true 
      })
        .populate('reviewedBy', 'name email')
        .sort({ reviewedAt: -1 })
        .lean();
    } catch (commentError) {
      // Log error but don't fail the entire request
      reportError(commentError, { route: '/api/forms/[id]', detail: 'Error fetching comments (non-fatal)' });
      comments = [];
    }

    const formPayload = form.toObject ? form.toObject() : form;
    const schoolYear = inferSchoolYear(formPayload);
    formPayload.schoolYear = schoolYear;

    let yearSettings = null;
    try {
      const { getYearSettings } = require('../../../../lib/schoolYearSettings');
      yearSettings = await getYearSettings(schoolYear);
    } catch (error) {
      console.warn('Could not load school year settings:', error.message);
    }

    formPayload.yearArchived = Boolean(yearSettings?.archived);
    formPayload.allowEditsWhenArchived = Boolean(formPayload.allowEditsWhenArchived);
    formPayload.locked = Boolean(yearSettings?.archived) && !formPayload.allowEditsWhenArchived;
    formPayload.deadlines = yearSettings?.deadlines || [];
    formPayload.districtGoals = yearSettings?.districtGoals || [];
    formPayload.needsUpdate = (formPayload.needsUpdate || []).filter((item) => !item.reviewedAt);
    formPayload.attestation = formPayload.attestation || { confirmed: false };
    if (!formPayload.completedSteps?.length) {
      const { deriveCompletedSteps } = require('../../../../lib/formDuplicate');
      formPayload.completedSteps = deriveCompletedSteps(formPayload.formData);
    }

    return NextResponse.json({ 
      form: formPayload, 
      collaborationInfo,
      userPermission, // Add explicit permission level
      comments: comments || [] // Include comments from FormComment collection
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]', detail: 'Error fetching form' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/forms/[id] - Update form data
async function PUT(request, { params }) {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount <= maxRetries) {
    try {
      const session = await getServerSession(authOptions);

      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Connect to database with retry logic
      try {
        await connectDB();
      } catch (dbError) {
        reportError(dbError, { route: '/api/forms/[id]', detail: 'Database connection error' });
        // If it's a connection error and we have retries left, retry
        if (retryCount < maxRetries && (
          dbError.name === 'MongoNetworkError' || 
          dbError.name === 'MongoServerSelectionError' ||
          dbError.message?.includes('connection') ||
          dbError.message?.includes('timeout')
        )) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue; // Retry the entire operation
        }
        return NextResponse.json({ 
          error: 'Database connection failed',
          message: 'Unable to connect to database. Please try again in a moment.',
          retryable: true
        }, { status: 503 });
      }

      // Fetch user with retry logic for database connection issues
      let user;
      let userRetryCount = 0;
      const maxUserRetries = 3;
      
      while (userRetryCount <= maxUserRetries) {
        try {
          user = await User.findOne({ email: session.user.email });
          if (user) break; // Success, exit retry loop
          
          // If user not found and it's not a connection error, return immediately
          if (userRetryCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
        } catch (userError) {
          // Check if it's a connection error
          const isConnectionError = userError.name === 'MongoNetworkError' || 
                                   userError.name === 'MongoServerSelectionError' ||
                                   userError.message?.includes('connection') ||
                                   userError.message?.includes('timeout');
          
          if (isConnectionError && userRetryCount < maxUserRetries) {
            userRetryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * userRetryCount));
            continue; // Retry
          }
          
          // If all retries failed or it's not a connection error, return error
          reportError(userError, { route: '/api/forms/[id]', detail: 'Error fetching user' });
          return NextResponse.json({ 
            error: 'Database connection error',
            message: 'Unable to verify user permissions. Please try again in a moment.',
            retryable: true
          }, { status: 503 });
        }
        userRetryCount++;
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const { id } = await params;
      
      // Fetch form with retry logic
      let form;
      let formRetryCount = 0;
      const maxFormRetries = 3;
      
      while (formRetryCount <= maxFormRetries) {
        try {
          form = await FormSubmission.findById(id);
          if (form) break; // Success, exit retry loop
          
          if (formRetryCount === 0) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
          }
        } catch (formError) {
          const isConnectionError = formError.name === 'MongoNetworkError' || 
                                   formError.name === 'MongoServerSelectionError' ||
                                   formError.message?.includes('connection') ||
                                   formError.message?.includes('timeout');
          
          if (isConnectionError && formRetryCount < maxFormRetries) {
            formRetryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * formRetryCount));
            continue;
          }
          
          reportError(formError, { route: '/api/forms/[id]', detail: 'Error fetching form' });
          return NextResponse.json({ 
            error: 'Database connection error',
            message: 'Unable to load form. Please try again in a moment.',
            retryable: true
          }, { status: 503 });
        }
        formRetryCount++;
      }

      if (!form) {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }

      if (!canEditForm(user, form)) {
        console.warn('Edit denied for form', {
          formId: id,
          userId: user._id?.toString(),
          userLevel: user.level,
        });

        return NextResponse.json({
          error: 'Access denied',
          message: 'You do not have permission to edit this form. Please contact an administrator to grant edit access.',
        }, { status: 403 });
      }

      const updateData = await request.json();
      const { step, stepData, currentStep, action } = updateData;
      const formYear = inferSchoolYear(form);
      const { isFormLocked } = require('../../../../lib/schoolYearSettings');
      const locked = await isFormLocked(form);
      if (locked && action !== 'review') {
        return NextResponse.json({
          error: 'This school year is archived',
          message: `${formYear} plans are read-only for audit. Super Admin can make this plan live, or duplicate into the new year.`,
        }, { status: 403 });
      }
      const bank = await getPublishedOrJson({
        schoolYear: formYear,
        version: form.questionBankVersion,
      });
      const stepNames = getStepKeys(bank.steps);

      // Handle different update actions
      if (action === 'save_step' && step && stepData) {
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
          .map(key => getStepNumberByKey(bank.steps, key))
          .filter(stepNumber => stepNumber !== undefined && stepNumber !== null)
          .sort((a, b) => a - b);
        
        form.completedSteps = completedSteps;
        form.markModified('formData');
      }
    }

      // Update current step if provided
      if (currentStep && currentStep >= 1 && currentStep <= stepNames.length) {
        form.currentStep = currentStep;
      }

      // Handle form submission
      if (action === 'submit') {
      if (form.duplicatedFrom && !form.attestation?.confirmed) {
        return NextResponse.json({
          error: 'Attestation required',
          message: 'Review the copied plan and sign the principal attestation before submitting.',
        }, { status: 400 });
      }
      form.status = 'submitted';
      form.submittedAt = new Date();
      
      // If complete form data is provided, update all steps
      if (updateData.formData) {
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
        .map(stepKey => getStepNumberByKey(bank.steps, stepKey))
        .filter(stepNumber => stepNumber !== undefined && stepNumber !== null)
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
        
        // Save comment to FormComment collection instead of FormSubmission
        if (comments && comments.trim().length > 0) {
          await FormComment.create({
            formId: form._id,
            reviewedBy: user._id,
            reviewedByName: user.name,
            reviewedByEmail: user.email,
            comment: comments.trim(),
            status: status,
            reviewedAt: new Date(),
            isActive: true,
          });
        }
        
        // Mark notification as sent for reviewed submissions
        if (['approved', 'rejected'].includes(status)) {
          form.notificationSent = true;
          form.notificationSentAt = new Date();
        }
      }
    }

      // Save form with retry logic for database operations
      try {
        await form.save();
      } catch (saveError) {
        reportError(saveError, { route: '/api/forms/[id]', detail: 'Error saving form' });
        // If it's a connection error and we have retries left, retry
        if (retryCount < maxRetries && (
          saveError.name === 'MongoNetworkError' || 
          saveError.name === 'MongoServerSelectionError' ||
          saveError.message?.includes('connection') ||
          saveError.message?.includes('timeout') ||
          saveError.message?.includes('buffered')
        )) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue; // Retry the entire operation
        }
        return NextResponse.json({ 
          error: 'Failed to save form',
          message: 'Unable to save to database. Please try again in a moment.',
          retryable: true
        }, { status: 503 });
      }

      // Success - break out of retry loop
      return NextResponse.json({ 
        success: true, 
        form,
        message: 'Form updated successfully' 
      });
    } catch (error) {
      // Handle non-database errors
      reportError(error, { route: '/api/forms/[id]', detail: 'Error updating form' });
      
      // Check if it's a database connection error
      if (error.name === 'MongoNetworkError' || 
          error.name === 'MongoServerSelectionError' ||
          error.message?.includes('connection') ||
          error.message?.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Database connection failed',
          message: 'Unable to connect to database. Please try again in a moment.',
          retryable: true
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
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
    reportError(error, { route: '/api/forms/[id]', detail: 'Error deleting form' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

module.exports = { GET, PUT, DELETE };