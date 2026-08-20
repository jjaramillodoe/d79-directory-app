import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const { getDraftTemplate, auditRequest } = require('../../../../../lib/questionBank');
const { toClientTemplate } = require('../../../../../lib/questionBankUtils');
const { logAction } = require('../../../../../lib/auditLogger');

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
    const { stepKey, questionIds } = body || {};

    if (!stepKey || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'stepKey and questionIds[] are required' }, { status: 400 });
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

    const existingIds = step.questions.map((question) => question.id);
    const missing = existingIds.filter((id) => !questionIds.includes(id));
    const unknown = questionIds.filter((id) => !existingIds.includes(id));
    if (missing.length || unknown.length) {
      return NextResponse.json(
        {
          error: 'Reorder must include every existing question ID and no extras. Questions are never deleted.',
          missing,
          unknown,
        },
        { status: 400 }
      );
    }

    const byId = new Map(step.questions.map((question) => [question.id, question]));
    const reordered = questionIds.map((id, index) => {
      const current = byId.get(id);
      const plain = typeof current.toObject === 'function' ? current.toObject() : { ...current };
      delete plain._id;
      plain.order = index;
      return plain;
    });
    step.questions = reordered;

    draft.updatedBy = session.user.id;
    draft.markModified('steps');
    await draft.save();

    await logAction({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: 'question_bank_updated',
      targetType: 'system',
      details: `Reordered questions in ${stepKey}`,
      metadata: { stepKey, questionIds },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      draft: toClientTemplate(draft),
    });
  } catch (error) {
    console.error('Error reordering questions:', error);
    return NextResponse.json({ error: 'Failed to reorder questions' }, { status: 500 });
  }
}
