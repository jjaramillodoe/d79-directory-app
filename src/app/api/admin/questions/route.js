import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import FormTemplate from '../../../../models/FormTemplate';
import { getAdminQuestionBank, getDraftTemplate, auditRequest } from '../../../../lib/questionBank';
import { sanitizeQuestionUpdates, toClientTemplate } from '../../../../lib/questionBankUtils';
import { logAction } from '../../../../lib/auditLogger';
import { reportError } from '../../../../lib/reportError';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.level !== 5) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const data = await getAdminQuestionBank();
    return NextResponse.json(data);
  } catch (error) {
    reportError(error, { route: '/api/admin/questions', detail: 'Error loading question bank' });
    return NextResponse.json({ error: 'Failed to load question bank' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { stepKey, questionId, updates } = body || {};

    if (!stepKey || !questionId) {
      return NextResponse.json({ error: 'stepKey and questionId are required' }, { status: 400 });
    }

    const sanitized = sanitizeQuestionUpdates(updates || {});
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

    const question = step.questions.find((item) => item.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const previous = {
      title: question.title,
      placeholder: question.placeholder,
      description: question.description,
      type: question.type,
      required: question.required,
      question_number: question.question_number,
      active: question.active,
    };

    Object.assign(question, sanitized);
    draft.updatedBy = auth.session.user.id;
    draft.markModified('steps');
    await draft.save();

    await logAction({
      userId: auth.session.user.id,
      userName: auth.session.user.name,
      userEmail: auth.session.user.email,
      action: 'question_bank_updated',
      targetType: 'system',
      details: `Updated question ${questionId} in ${stepKey}`,
      metadata: { stepKey, questionId, previous, updates: sanitized },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      question,
      draft: toClientTemplate(draft),
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/questions', detail: 'Error updating question' });
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}
