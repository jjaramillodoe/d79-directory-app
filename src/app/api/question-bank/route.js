import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../lib/auth');
const { getPublishedOrJson, getDraftTemplate } = require('../../../lib/questionBank');
const { toClientTemplate } = require('../../../lib/questionBankUtils');

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolYear = searchParams.get('schoolYear') || '';
    const version = searchParams.get('version') || '';
    const wantDraft = searchParams.get('draft') === '1';
    const preferPublished = searchParams.get('latest') === '1';
    const actorIsSuperAdmin =
      Number(session.user.level) === 5 || Number(session.actorLevel) === 5;

    if (wantDraft) {
      if (!actorIsSuperAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const draft = await getDraftTemplate();
      const payload = toClientTemplate(draft);
      if (!payload?.steps?.length) {
        return NextResponse.json({ error: 'Draft question bank not found' }, { status: 404 });
      }
      return NextResponse.json(
        {
          version: payload.version,
          status: payload.status,
          schoolYear: payload.schoolYear || '',
          steps: payload.steps,
          source: 'draft',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const bank = await getPublishedOrJson({
      schoolYear: schoolYear || undefined,
      version: preferPublished ? undefined : version || undefined,
      preferPublished,
    });
    return NextResponse.json(bank, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading published question bank:', error);
    return NextResponse.json({ error: 'Failed to load question bank' }, { status: 500 });
  }
}
