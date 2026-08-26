import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const { getDraftTemplate, auditRequest } = require('../../../../../lib/questionBank');
const {
  nextQuestionId,
  nextQuestionNumber,
  sanitizeQuestionUpdates,
  toClientTemplate,
  ALLOWED_TYPES,
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
    const { stepKey } = body || {};
    if (!stepKey) {
      return NextResponse.json({ error: 'stepKey is required' }, { status: 400 });
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

    const sanitized = sanitizeQuestionUpdates({
      title: body.title,
      placeholder: body.placeholder,
      description: body.description,
      type: body.type,
      required: body.required,
      question_number: body.question_number,
      columns: body.columns,
      active: true,
    });

    const question = {
      id: nextQuestionId(step),
      question_number: sanitized.question_number || nextQuestionNumber(step),
      title: sanitized.title || 'New question',
      placeholder: sanitized.placeholder || '',
      description: sanitized.description || '',
      type: ALLOWED_TYPES.includes(sanitized.type) ? sanitized.type : 'textarea',
      required: Boolean(sanitized.required),
      columns: sanitized.columns || [],
      gatesFollowing: Boolean(sanitized.gatesFollowing),
      visibleWhen: sanitized.visibleWhen || undefined,
      active: true,
      order: step.questions.length,
    };

    step.questions.push(question);
    draft.updatedBy = session.user.id;
    draft.markModified('steps');
    await draft.save();

    await logAction({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: 'question_bank_updated',
      targetType: 'system',
      details: `Added question ${question.id} to ${stepKey}`,
      metadata: { stepKey, questionId: question.id },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      question,
      draft: toClientTemplate(draft),
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/questions/add', detail: 'Error adding question' });
    return NextResponse.json({ error: 'Failed to add question' }, { status: 500 });
  }
}
