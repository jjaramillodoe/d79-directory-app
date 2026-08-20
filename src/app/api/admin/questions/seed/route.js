import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../../../lib/auth');
const { seedFromJson, auditRequest } = require('../../../../../lib/questionBank');
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

    const result = await seedFromJson({ userId: session.user.id, force: false });

    if (result.seeded) {
      const { invalidateQuestionBankCache, invalidateOverviewCache } = require('../../../../../lib/redis');
      await invalidateQuestionBankCache();
      await invalidateOverviewCache();
      await logAction({
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: 'question_bank_seeded',
        targetType: 'system',
        details: 'Seeded question bank from formQuestions.json',
        request: auditRequest(request),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error seeding question bank:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed question bank' }, { status: 500 });
  }
}
