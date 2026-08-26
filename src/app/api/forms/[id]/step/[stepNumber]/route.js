import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import FormSubmission from '../../../../../../models/FormSubmission';
import User from '../../../../../../models/User';
import { acquireLock, releaseLock } from '../../../../../../lib/locking';
import { getPublishedOrJson } from '../../../../../../lib/questionBank';
import { getStepKeyByNumber } from '../../../../../../lib/formSteps';
import { normalizeIncomingData, diffDirtyFields, buildCompletedSteps } from '../../../../../../lib/stepSave';
import { rateLimit } from '../../../../../../lib/redis';
import { reportError } from '../../../../../../lib/reportError';
import { canViewForm, canEditForm } from '../../../../../../lib/formAccess';
import { productionFailClosed } from '../../../../../../lib/userAccess';
import { inferSchoolYear } from '../../../../../../lib/schoolYear';
import { isFormLocked } from '../../../../../../lib/schoolYearSettings';

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

    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const bank = await getPublishedOrJson({
      schoolYear: inferSchoolYear(form),
      version: form.questionBankVersion,
    });
    const stepKey = getStepKeyByNumber(bank.steps, stepNum);
    if (!stepKey) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    if (!canViewForm(user, form)) {
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
    reportError(error, { route: 'GET /api/forms/[id]/step/[stepNumber]' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function PUT(request, { params }) {
  let lockAcquired = false;
  let id;
  let stepKey;
  let userId;

  const releaseLockOnExit = async () => {
    if (lockAcquired && id && stepKey && userId) {
      await releaseLock(id, stepKey, userId);
      lockAcquired = false;
    }
  };

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

    const resolved = await params;
    id = resolved.id;
    const stepNum = parseInt(resolved.stepNumber, 10);
    userId = user._id.toString();

    const limited = await rateLimit(`rl:save:${userId}:${id}`, 30, 60, {
      failClosed: productionFailClosed(),
    });
    if (!limited.ok) {
      return NextResponse.json({
        error: 'Too many saves',
        message: 'Please wait a moment before saving again.',
        retryAfter: limited.retryAfter,
      }, {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfter) },
      });
    }

    const body = await request.json();
    const {
      lastUpdated: clientLastUpdated,
      revisionCount: clientRevision,
      mergeStrategy = 'reject',
      dirty,
    } = body || {};
    let incoming = normalizeIncomingData(body?.stepData, dirty);

    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (await isFormLocked(form)) {
      return NextResponse.json({
        error: 'This school year is archived and read-only',
      }, { status: 403 });
    }

    const bank = await getPublishedOrJson({
      schoolYear: inferSchoolYear(form),
      version: form.questionBankVersion,
    });
    stepKey = getStepKeyByNumber(bank.steps, stepNum);
    if (!stepKey) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    if (!canEditForm(user, form)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You do not have permission to edit this form.',
      }, { status: 403 });
    }

    const lockResult = await acquireLock(
      id,
      stepKey,
      userId,
      user.name || user.email,
      user.email,
      45
    );
    if (!lockResult.success) {
      return NextResponse.json({
        error: 'Step is locked',
        message: lockResult.message || 'This step is currently being edited by another user. Please wait and try again.',
        lockedBy: lockResult.lockedBy,
        conflict: true,
      }, { status: 423 });
    }
    lockAcquired = true;
    // True when the lock could not be coordinated across instances, so the "being edited
    // by" indicator cannot be trusted. The save itself is still guarded by revisionCount.
    const lockDegraded = Boolean(lockResult.degraded);

    const currentStepData = form.formData?.[stepKey] || {
      completed: false,
      data: {},
      startedAt: null,
      lastUpdated: null,
      timeSpent: 0,
      revisionCount: 0,
    };
    const serverData = currentStepData.data && typeof currentStepData.data === 'object'
      ? currentStepData.data
      : {};
    const serverRevision = Number(currentStepData.revisionCount || 0);
    const dirtyFields = diffDirtyFields(incoming, serverData);

    if (clientRevision !== undefined && clientRevision !== null && Number(clientRevision) !== serverRevision) {
      if (mergeStrategy === 'last-write-wins') {
        // Apply dirty fields only; lock already serializes this writer.
      } else if (mergeStrategy === 'merge') {
        Object.keys(dirtyFields).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(serverData, key) && !valuesEqualMaybe(serverData[key], incoming[key])) {
            delete dirtyFields[key];
          }
        });
      } else {
        await releaseLockOnExit();
        return NextResponse.json({
          error: 'Conflict detected',
          message: 'This step was modified by another user. Please refresh and try again.',
          conflict: true,
          serverData,
          serverLastUpdated: currentStepData.lastUpdated,
          serverRevision,
          clientLastUpdated,
          clientRevision,
        }, { status: 409 });
      }
    }

    if (Object.keys(dirtyFields).length === 0 && Object.keys(incoming).length > 0) {
      await releaseLockOnExit();
      return NextResponse.json({
        success: true,
        message: 'No changes to save',
        stepData: currentStepData,
        stepKey,
        stepNumber: stepNum,
        lastUpdated: currentStepData.lastUpdated,
        revisionCount: serverRevision,
        conflict: false,
        lockDegraded,
      });
    }

    const now = new Date();
    const updateData = {
      [`formData.${stepKey}.lastUpdated`]: now,
      updatedAt: now,
    };
    Object.keys(dirtyFields).forEach((questionId) => {
      updateData[`formData.${stepKey}.data.${questionId}`] = dirtyFields[questionId];
    });
    if (!currentStepData.startedAt) {
      updateData[`formData.${stepKey}.startedAt`] = now;
    }

    const mergedData = { ...serverData, ...dirtyFields };
    const hasData = Object.keys(mergedData).length > 0;
    updateData[`formData.${stepKey}.completed`] = hasData;

    const nextFormData = {
      ...(form.formData && typeof form.formData.toObject === 'function'
        ? form.formData.toObject()
        : form.formData || {}),
    };
    nextFormData[stepKey] = {
      ...currentStepData,
      data: mergedData,
      completed: hasData,
      lastUpdated: now,
    };
    updateData.completedSteps = buildCompletedSteps(nextFormData, bank.steps);

    const filter = { _id: id };
    if (clientRevision !== undefined && clientRevision !== null && mergeStrategy !== 'last-write-wins') {
      const revision = Number(clientRevision);
      filter.$or = [
        { [`formData.${stepKey}.revisionCount`]: revision },
      ];
      if (revision === 0) {
        filter.$or.push({ [`formData.${stepKey}.revisionCount`]: { $exists: false } });
      }
    }

    const updatedForm = await FormSubmission.findOneAndUpdate(
      filter,
      {
        $set: {
          ...updateData,
          currentStep: stepNum,
        },
        $inc: { [`formData.${stepKey}.revisionCount`]: 1 },
      },
      { new: true, runValidators: true, strict: false }
    );

    if (!updatedForm) {
      await releaseLockOnExit();
      return NextResponse.json({
        error: 'Conflict detected',
        message: 'This step was modified by another user. Please refresh and try again.',
        conflict: true,
        serverData,
        serverRevision,
      }, { status: 409 });
    }

    await releaseLockOnExit();
    const savedStep = updatedForm.formData?.[stepKey] || nextFormData[stepKey];
    return NextResponse.json({
      success: true,
      message: 'Step updated successfully',
      stepData: savedStep,
      stepKey,
      stepNumber: stepNum,
      lastUpdated: savedStep.lastUpdated,
      revisionCount: savedStep.revisionCount,
      conflict: false,
      lockDegraded,
    });
  } catch (error) {
    await releaseLockOnExit();
    reportError(error, { route: 'PUT /api/forms/[id]/step/[stepNumber]', formId: id, stepKey });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function valuesEqualMaybe(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export { GET, PUT };
