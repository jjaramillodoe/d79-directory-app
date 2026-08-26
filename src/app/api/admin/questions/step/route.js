import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const { getDraftTemplate, auditRequest } = require('../../../../../lib/questionBank');
const { sanitizeStepUpdates, toClientTemplate } = require('../../../../../lib/questionBankUtils');
const { logAction } = require('../../../../../lib/auditLogger');
const { reportError } = require('../../../../../lib/reportError');

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { stepKey, updates } = body || {};
    if (!stepKey) {
      return NextResponse.json({ error: 'stepKey is required' }, { status: 400 });
    }

    const sanitized = sanitizeStepUpdates(updates || {});
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectDB();
    const draft = await getDraftTemplate();
    if (!draft) {
      return NextResponse.json({ error: 'Draft question bank not found' }, { status: 404 });
    }

    const step = draft.steps.find((item) => item.key === stepKey);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    const previous = {
      title: step.title,
      intro: step.intro || '',
    };

    Object.assign(step, sanitized);
    draft.updatedBy = session.user.id;
    draft.markModified('steps');
    await draft.save();

    await logAction({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: 'question_bank_updated',
      targetType: 'system',
      details: `Updated step ${stepKey}`,
      metadata: { stepKey, previous, updates: sanitized },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      step,
      draft: toClientTemplate(draft),
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/questions/step', detail: 'Error updating step' });
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }
}
