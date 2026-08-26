import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FormSubmission from '../../../../../models/FormSubmission';
import User from '../../../../../models/User';
import { getActiveEditors } from '../../../../../lib/activeEditors';
import { canViewForm } from '../../../../../lib/formAccess';
import { reportError } from '../../../../../lib/reportError';

// GET /api/forms/[id]/editors - Get all active editors for a form
async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;

    // Check if user has permission to view this form
    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (!canViewForm(user, form)) {
      return NextResponse.json({ 
        error: 'Access denied',
        message: 'You do not have permission to view this form.'
      }, { status: 403 });
    }

    // Get all active editors for this form
    const editors = await getActiveEditors(id);

    const stepMap = {};
    const uniqueEditors = [];
    const seenOnStep = new Set();
    const latestByPerson = new Map();

    editors.forEach((editor) => {
      const stepKey = `${editor.userId || editor.email}-${editor.stepKey}`;
      if (seenOnStep.has(stepKey)) return;
      seenOnStep.add(stepKey);

      if (!stepMap[editor.stepKey]) stepMap[editor.stepKey] = [];
      stepMap[editor.stepKey].push({
        userId: editor.userId,
        userName: editor.userName,
        email: editor.email,
        lastSeen: editor.lastSeen,
      });

      const personKey = String(editor.email || editor.userId || '').toLowerCase();
      if (!personKey) return;
      const existing = latestByPerson.get(personKey);
      if (!existing || new Date(editor.lastSeen) > new Date(existing.lastSeen || 0)) {
        latestByPerson.set(personKey, editor);
      }
    });

    uniqueEditors.push(...latestByPerson.values());

    return NextResponse.json({
      success: true,
      editors: uniqueEditors,
      editorsByStep: stepMap,
      totalEditors: uniqueEditors.length,
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/editors', detail: 'Error getting active editors' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export named exports for Next.js 16
export { GET };

