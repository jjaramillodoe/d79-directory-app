import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../../lib/auth';
import { clientSafeMessage, enforceRateLimit } from '../../../../../lib/userAccess';
import { logAction } from '../../../../../lib/auditLogger';
import { auditRequest } from '../../../../../lib/questionBank';
import { reportError } from '../../../../../lib/reportError';
import {
  previewFormPopulation,
  populateEmptyFormFromBank,
} from '../../../../../lib/populateFormFromBank';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (Number(session.user.level) !== 5) {
    return { error: NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 }) };
  }
  return { session };
}

function optionsFrom(request, body = {}) {
  const url = new URL(request.url);
  return {
    formId: String(body.formId || url.searchParams.get('formId') || '').trim(),
    version: body.version ?? url.searchParams.get('version') ?? 23,
    schoolYear: String(body.schoolYear || url.searchParams.get('schoolYear') || '2026-2027').trim(),
    label: String(body.label || url.searchParams.get('label') || '2026-2027 Draft v23').trim(),
    requirePublished: body.requirePublished !== false,
    force: Boolean(body.force),
    fillAnswers: Boolean(body.fillAnswers) || url.searchParams.get('fillAnswers') === 'true',
  };
}

export async function GET(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const limited = await enforceRateLimit(`rl:populate-bank:${auth.session.user.id}`, 30, 60);
    if (limited) return limited;

    const preview = await previewFormPopulation(optionsFrom(request));
    return NextResponse.json({ success: true, apply: false, ...preview });
  } catch (error) {
    reportError(error, { route: 'GET /api/admin/forms/populate-bank' });
    return NextResponse.json(
      { error: clientSafeMessage(error, 'Could not preview form population') },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const limited = await enforceRateLimit(`rl:populate-bank-write:${auth.session.user.id}`, 10, 60);
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const options = optionsFrom(request, body);

    if (!body.apply) {
      const preview = await previewFormPopulation(options);
      return NextResponse.json({ success: true, apply: false, ...preview });
    }

    const result = await populateEmptyFormFromBank({
      ...options,
      actor: auth.session.user,
    });

    await logAction({
      userId: auth.session.user.id,
      userName: auth.session.user.name,
      userEmail: auth.session.user.email,
      action: 'form_edited',
      targetType: 'form',
      targetId: result.formId,
      details: result.fillAnswers
        ? `Seeded form responses from question bank v${result.questionBankVersion}`
        : `Populated empty form from question bank v${result.questionBankVersion}`,
      metadata: result,
      request: auditRequest(request),
    });

    return NextResponse.json({ success: true, apply: true, ...result });
  } catch (error) {
    reportError(error, { route: 'POST /api/admin/forms/populate-bank' });
    return NextResponse.json(
      { error: clientSafeMessage(error, 'Could not populate form from the question bank') },
      { status: error.status || 500 }
    );
  }
}
