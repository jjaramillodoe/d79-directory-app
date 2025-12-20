const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const FormSubmission = require('../../../../../../models/FormSubmission');
const User = require('../../../../../../models/User');
const { acquireLock, releaseLock, refreshLock } = require('../../../../../../lib/locking');
const { hasOtherEditors } = require('../../../../../../lib/activeEditors');

// Step key mapping
const stepKeyMap = {
  1: 'tableOfContents',
  2: 'childAbuseIntervention',
  3: 'sexualHarassment',
  4: 'respectForAll',
  5: 'suicidePrevention',
  6: 'attendancePlan',
  7: 'temporaryHousing',
  8: 'serviceInSchools',
  9: 'planningInterviews',
  10: 'militaryRecruitment',
  11: 'schoolCulture',
  12: 'afterSchoolPrograms',
  13: 'cellPhonePolicy',
  14: 'counselingPlan'
};

// GET /api/forms/[id]/step/[stepNumber] - Get specific step data
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

    const { id, stepNumber } = await params;
    const stepNum = parseInt(stepNumber);
    const stepKey = stepKeyMap[stepNum];

    if (!stepKey) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check permissions (same logic as main form route)
    const formUserId = form.userId?.toString();
    const userId = user._id?.toString();
    const isOwner = formUserId === userId;
    const isPrincipalByEmail = form.principalEmail?.toLowerCase() === user.email?.toLowerCase();
    const isSuperAdmin = user.level === 5;
    const isSameSchool = user.schoolName === form.schoolName && (user.level === 2 || user.level === 3);
    const hasEditAccess = form.editAccess?.some(ea => ea.userId?.toString() === userId);
    const isAssignedLevel3 = user.level === 3 && form.assignedTo?.some(at => at.userId?.toString() === userId);
    const shareEntry = form.sharedWithEmails?.find(share => share.email?.toLowerCase() === user.email?.toLowerCase());
    const hasSharedEditAccess = shareEntry && shareEntry.permissions === 'edit';

    if (!isOwner && !isPrincipalByEmail && !isSuperAdmin && !isSameSchool && !hasEditAccess && !isAssignedLevel3 && !hasSharedEditAccess) {
      return NextResponse.json({ 
        error: 'Access denied',
        message: 'You do not have permission to view this form.'
      }, { status: 403 });
    }

    const stepData = form.formData?.[stepKey] || {
      completed: false,
      data: {},
      startedAt: null,
      lastUpdated: null,
      timeSpent: 0,
      revisionCount: 0
    };

    return NextResponse.json({
      success: true,
      stepData,
      stepKey,
      stepNumber: stepNum,
      lastUpdated: stepData.lastUpdated,
      revisionCount: stepData.revisionCount || 0
    });
  } catch (error) {
    console.error('Error fetching step data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// PUT /api/forms/[id]/step/[stepNumber] - Update specific step data with conflict detection
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

    const { id, stepNumber } = await params;
    const stepNum = parseInt(stepNumber);
    const stepKey = stepKeyMap[stepNum];

    if (!stepKey) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    const body = await request.json();
    let { stepData: newStepData, lastUpdated: clientLastUpdated, mergeStrategy = 'last-write-wins' } = body;

    // Fetch form with retry logic
    let form;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        form = await FormSubmission.findById(id);
        if (form) break;
        
        if (retryCount === 0) {
          return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }
      } catch (error) {
        if (retryCount < maxRetries && (
          error.name === 'MongoNetworkError' || 
          error.name === 'MongoServerSelectionError'
        )) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        throw error;
      }
      retryCount++;
    }

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check permissions
    const formUserId = form.userId?.toString();
    const userId = user._id?.toString();
    const isOwner = formUserId === userId;
    const isPrincipalByEmail = form.principalEmail?.toLowerCase() === user.email?.toLowerCase();
    const isSuperAdmin = user.level === 5;
    const isSameSchool = user.schoolName === form.schoolName && (user.level === 2 || user.level === 3);
    const hasEditAccess = form.editAccess?.some(ea => ea.userId?.toString() === userId);
    const isAssignedLevel3 = user.level === 3 && form.assignedTo?.some(at => at.userId?.toString() === userId);
    const shareEntry = form.sharedWithEmails?.find(share => share.email?.toLowerCase() === user.email?.toLowerCase());
    const hasSharedEditAccess = shareEntry && shareEntry.permissions === 'edit';

    if (!isOwner && !isPrincipalByEmail && !isSuperAdmin && !isSameSchool && !hasEditAccess && !isAssignedLevel3 && !hasSharedEditAccess) {
      return NextResponse.json({ 
        error: 'Access denied',
        message: 'You do not have permission to edit this form.'
      }, { status: 403 });
    }

    // Get current step data
    const currentStepData = form.formData?.[stepKey] || {
      completed: false,
      data: {},
      startedAt: null,
      lastUpdated: null,
      timeSpent: 0,
      revisionCount: 0
    };

    // Check if someone else is actively editing this step
    // Only block if another user is editing the SAME step
    const hasOthers = await hasOtherEditors(id, stepKey, userId);
    let lockAcquired = false;
    
    if (hasOthers) {
      // Another user is editing this step - try to acquire lock (will fail if they have it)
      const lockResult = await acquireLock(
        id,
        stepKey,
        userId,
        user.name || user.email,
        user.email,
        30 // Short lock for save operation (30 seconds)
      );

      if (!lockResult.success) {
        return NextResponse.json({
          error: 'Step is locked',
          message: lockResult.message || 'This step is currently being edited by another user. Please wait and try again.',
          lockedBy: lockResult.lockedBy,
          conflict: true
        }, { status: 423 }); // 423 Locked status code
      }
      
      // Lock acquired - will be released after save
      lockAcquired = true;
    }
    // If no other editors, proceed without lock (allow concurrent saves on different steps)

    // Release lock if we acquired one
    let lockReleased = false;
    const releaseLockOnExit = async () => {
      if (lockAcquired && !lockReleased) {
        await releaseLock(id, stepKey, userId);
        lockReleased = true;
      }
    };

    // Conflict detection: Check if data was modified since client last fetched it
    if (clientLastUpdated && currentStepData.lastUpdated) {
      const serverLastUpdated = new Date(currentStepData.lastUpdated).getTime();
      const clientLastUpdatedTime = new Date(clientLastUpdated).getTime();
      
      if (serverLastUpdated > clientLastUpdatedTime) {
        // Conflict detected - server has newer data
        if (mergeStrategy === 'reject') {
          return NextResponse.json({
            error: 'Conflict detected',
            message: 'This step was modified by another user. Please refresh and try again.',
            conflict: true,
            serverData: currentStepData.data,
            serverLastUpdated: currentStepData.lastUpdated,
            clientLastUpdated: clientLastUpdated
          }, { status: 409 });
        } else if (mergeStrategy === 'merge') {
          // Merge strategy: combine non-conflicting fields
          const mergedData = { ...currentStepData.data };
          Object.keys(newStepData).forEach(key => {
            // Only merge if the field wasn't changed on server
            if (!mergedData[key] || JSON.stringify(mergedData[key]) === JSON.stringify(currentStepData.data[key])) {
              mergedData[key] = newStepData[key];
            }
          });
          newStepData = mergedData;
        }
        // else: 'last-write-wins' - use newStepData as is
      }
    }

    // Prepare update object for atomic operation
    const updateData = {
      [`formData.${stepKey}.data`]: newStepData,
      [`formData.${stepKey}.lastUpdated`]: new Date(),
      [`formData.${stepKey}.revisionCount`]: (currentStepData.revisionCount || 0) + 1,
      updatedAt: new Date()
    };

    // Set startedAt if not already set
    if (!currentStepData.startedAt) {
      updateData[`formData.${stepKey}.startedAt`] = new Date();
    }

    // Check if step is completed (has data)
    const hasData = newStepData && Object.keys(newStepData).length > 0;
    updateData[`formData.${stepKey}.completed`] = hasData;

    // Update completed steps array
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

    try {
      // Use findOneAndUpdate for atomic operation
      const updatedForm = await FormSubmission.findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedForm) {
        await releaseLockOnExit();
        return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
      }

      // Recalculate completed steps
      const completedSteps = Object.keys(updatedForm.formData)
        .filter(key => updatedForm.formData[key]?.completed)
        .map(key => stepNumberMap[key])
        .filter(stepNumber => stepNumber !== undefined)
        .sort((a, b) => a - b);

      updatedForm.completedSteps = completedSteps;
      await updatedForm.save();

      // Release lock immediately after successful save (no need to hold it)
      if (lockAcquired) {
        await releaseLockOnExit();
      }

      return NextResponse.json({
        success: true,
        message: 'Step updated successfully',
        stepData: updatedForm.formData[stepKey],
        stepKey,
        stepNumber: stepNum,
        lastUpdated: updatedForm.formData[stepKey].lastUpdated,
        revisionCount: updatedForm.formData[stepKey].revisionCount,
        conflict: false
      });
    } catch (error) {
      // Release lock on error
      await releaseLockOnExit();
      throw error;
    }
  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// Export named exports for Next.js 16 (ES module syntax)
export { GET, PUT };

