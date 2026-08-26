import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import { getDraftTemplate, getPublishedTemplate, auditRequest } from '../../../../../lib/questionBank';
import { cloneSteps, toClientTemplate } from '../../../../../lib/questionBankUtils';
import { logAction } from '../../../../../lib/auditLogger';
import { invalidateQuestionBankCache } from '../../../../../lib/redis';
import { reportError } from '../../../../../lib/reportError';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    await connectDB();
    const draft = await getDraftTemplate();
    const published = await getPublishedTemplate();

    if (!draft || !published) {
      return NextResponse.json({ error: 'Draft or published question bank not found' }, { status: 404 });
    }

    draft.steps = cloneSteps(published.steps);
    draft.updatedBy = session.user.id;
    draft.source = 'discard-to-published';
    draft.markModified('steps');
    await draft.save();

    await invalidateQuestionBankCache();

    await logAction({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: 'question_bank_updated',
      targetType: 'system',
      details: `Discarded draft v${draft.version} and restored published v${published.version}`,
      metadata: { draftVersion: draft.version, publishedVersion: published.version },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      draft: toClientTemplate(draft),
      published: toClientTemplate(published),
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/questions/discard', detail: 'Error discarding draft' });
    return NextResponse.json({ error: 'Failed to discard draft' }, { status: 500 });
  }
}
