import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const { authOptions } = require('../../../lib/auth');
const { getPublishedOrJson } = require('../../../lib/questionBank');

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolYear = searchParams.get('schoolYear') || '';
    const version = searchParams.get('version') || '';
    const bank = await getPublishedOrJson({
      schoolYear: schoolYear || undefined,
      version: version || undefined,
    });
    return NextResponse.json(bank);
  } catch (error) {
    console.error('Error loading published question bank:', error);
    return NextResponse.json({ error: 'Failed to load question bank' }, { status: 500 });
  }
}
