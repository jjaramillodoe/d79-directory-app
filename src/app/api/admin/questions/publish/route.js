import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const connectDB = require('../../../../../lib/mongodb');
const FormTemplate = require('../../../../../models/FormTemplate');
const {
  getDraftTemplate,
  getPublishedTemplate,
  auditRequest,
} = require('../../../../../lib/questionBank');
const { cloneSteps, toClientTemplate } = require('../../../../../lib/questionBankUtils');
const { logAction } = require('../../../../../lib/auditLogger');
const { invalidateQuestionBankCache, invalidateOverviewCache } = require('../../../../../lib/redis');

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Publish requires confirmation. Send { confirm: true }.' },
        { status: 400 }
      );
    }
    const pinYear = String(body.schoolYear || '').trim();

    await connectDB();
    const draft = await getDraftTemplate();
    if (!draft) {
      return NextResponse.json({ error: 'Draft question bank not found' }, { status: 404 });
    }

    const currentPublished = await getPublishedTemplate();
    const previousVersion = currentPublished?.version || null;

    if (currentPublished) {
      currentPublished.status = 'archived';
      currentPublished.updatedBy = session.user.id;
      await currentPublished.save();
    }

    draft.status = 'published';
    draft.publishedBy = session.user.id;
    draft.publishedAt = new Date();
    draft.updatedBy = session.user.id;
    if (pinYear) draft.schoolYear = pinYear;
    await draft.save();

    if (pinYear) {
      const { upsertYearSettings } = require('../../../../../lib/schoolYearSettings');
      await upsertYearSettings(pinYear, { questionBankVersion: draft.version }, session.user.id);
    }

    const nextDraft = await FormTemplate.create({
      version: draft.version + 1,
      status: 'draft',
      steps: cloneSteps(draft.steps),
      source: 'published-clone',
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });

    await invalidateQuestionBankCache();
    await invalidateOverviewCache();

    await logAction({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: 'question_bank_published',
      targetType: 'system',
      details: `Published question bank v${draft.version}`,
      metadata: {
        publishedVersion: draft.version,
        previousVersion,
        archivedTemplateId: currentPublished?._id ? String(currentPublished._id) : null,
      },
      request: auditRequest(request),
    });

    return NextResponse.json({
      success: true,
      published: toClientTemplate(draft),
      draft: toClientTemplate(nextDraft),
    });
  } catch (error) {
    const { reportError } = require('../../../../../lib/reportError');
    reportError(error, { route: 'POST /api/admin/questions/publish' });
    return NextResponse.json({ error: 'Failed to publish question bank' }, { status: 500 });
  }
}
