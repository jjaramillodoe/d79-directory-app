import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const { getDraftTemplate, auditRequest } = require('../../../../../lib/questionBank');
const {
  nextStepId,
  nextStepKey,
  toClientTemplate,
} = require('../../../../../lib/questionBankUtils');
const { logAction } = require('../../../../../lib/auditLogger');
const { reportError } = require('../../../../../lib/reportError');

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Step title is required' }, { status: 400 });
    }

    await connectDB();
    const draft = await getDraftTemplate();
    if (!draft) {
      return NextResponse.json({ error: 'Draft question bank not found' }, { status: 404 });
    }

    const step = {
      id: nextStepId(draft.steps),
      key: nextStepKey(draft.steps, title),
      title,
      intro: '',
      questions: [],
    };

    draft.steps.push(step);
    draft.updatedBy = session.user.id;
    draft.markModified('steps');
    await draft.save();

    await logAction({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: 'question_bank_updated',
      targetType: 'system',
      details: `Added step ${step.key} (${step.title})`,
      metadata: { stepKey: step.key, stepId: step.id, title: step.title },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      step,
      draft: toClientTemplate(draft),
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/questions/add-step', detail: 'Error adding step' });
    return NextResponse.json({ error: 'Failed to add step' }, { status: 500 });
  }
}
