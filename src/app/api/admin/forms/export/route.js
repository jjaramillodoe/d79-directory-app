import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FormSubmission from '../../../../../models/FormSubmission';
import User from '../../../../../models/User';
import { isValidSchoolYear, currentSchoolYear, schoolYearQuery } from '../../../../../lib/schoolYear';
import { getPublishedOrJson } from '../../../../../lib/questionBank';
import { COMPARE_STEPS, formatAnswer, getYearSettings } from '../../../../../lib/schoolYearSettings';
import { enforceRateLimit } from '../../../../../lib/userAccess';
import { reportError } from '../../../../../lib/reportError';

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    // District-wide export scans every plan; cap it per user.
    const limited = await enforceRateLimit(`rl:export-district:${user._id}`, 5, 60);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const schoolYear = String(searchParams.get('schoolYear') || currentSchoolYear()).trim();
    const format = String(searchParams.get('format') || 'csv').toLowerCase();
    if (!isValidSchoolYear(schoolYear)) {
      return NextResponse.json({ error: 'Enter a school year like 2026-2027' }, { status: 400 });
    }

    const forms = await FormSubmission.find(schoolYearQuery(schoolYear))
      .sort({ schoolName: 1 })
      .lean();
    const settings = await getYearSettings(schoolYear);
    const bank = await getPublishedOrJson({
      schoolYear,
      version: settings.questionBankVersion,
    });
    const compareSteps = (bank.steps || []).filter((step) =>
      COMPARE_STEPS.some((item) => item.key === step.key)
    );
    const questionColumns = [];
    compareSteps.forEach((step) => {
      (step.questions || []).forEach((question) => {
        if (question.active === false) return;
        questionColumns.push({
          stepKey: step.key,
          questionId: question.id,
          header: `${step.title} · ${question.question_number || question.id}`,
        });
      });
    });

    if (format === 'html' || format === 'pdf') {
      const sections = forms.map((form) => {
        const blocks = compareSteps.map((step) => {
          const answers = (step.questions || [])
            .filter((question) => question.active !== false)
            .map((question) => ({
              number: question.question_number || '',
              title: question.title,
              value: formatAnswer(form.formData?.[step.key]?.data?.[question.id]) || '—',
            }));
          return { title: step.title, answers };
        });
        return {
          schoolName: form.schoolName,
          principalName: form.principalName,
          status: form.status,
          formId: String(form._id),
          blocks,
        };
      });

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${schoolYear} school plans</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
  h1 { margin-bottom: 8px; }
  .school { page-break-after: always; margin-bottom: 32px; }
  h2 { margin: 0 0 8px; }
  h3 { margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; vertical-align: top; }
  th { background: #f3f4f6; width: 40%; }
</style></head><body>
  <h1>District 79 school plans · ${schoolYear}</h1>
  <p>${forms.length} school${forms.length === 1 ? '' : 's'}</p>
  ${sections.map((section) => `
    <section class="school">
      <h2>${section.schoolName}</h2>
      <p>${section.principalName} · ${section.status}</p>
      ${section.blocks.map((block) => `
        <h3>${block.title}</h3>
        <table>
          ${block.answers.map((answer) => `<tr><th>${answer.number} ${answer.title}</th><td>${String(answer.value).replace(/</g, '&lt;')}</td></tr>`).join('')}
        </table>
      `).join('')}
    </section>
  `).join('')}
</body></html>`;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="d79-plans-${schoolYear}.html"`,
        },
      });
    }

    const headers = ['School', 'Principal', 'Email', 'Status', 'School year', ...questionColumns.map((col) => col.header)];
    const lines = [headers.map(csvCell).join(',')];
    forms.forEach((form) => {
      const cells = [
        form.schoolName,
        form.principalName,
        form.principalEmail,
        form.status,
        schoolYear,
        ...questionColumns.map((col) => formatAnswer(form.formData?.[col.stepKey]?.data?.[col.questionId])),
      ];
      lines.push(cells.map(csvCell).join(','));
    });

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="d79-plans-${schoolYear}.csv"`,
      },
    });
  } catch (error) {
    reportError(error, { route: '/api/admin/forms/export', detail: 'Error exporting school year forms' });
    return NextResponse.json({ error: 'Failed to export school year forms' }, { status: 500 });
  }
}
