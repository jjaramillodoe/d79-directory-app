const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const FormSubmission = require('../../../../../../models/FormSubmission');
const User = require('../../../../../../models/User');
const { getPublishedOrJson } = require('../../../../../../lib/questionBank');
const { isTableAnswered } = require('../../../../../../lib/tableAnswer');
const { visibleQuestions, formatYesNo } = require('../../../../../../lib/questionBankUtils');
const { resolveExportTable, buildDocxTable } = require('../../../../../../lib/exportTables');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const path = require('path');
const fs = require('fs');

// Helper function to load form questions
async function loadFormQuestions(form) {
  try {
    const { inferSchoolYear } = require('../../../../../../lib/schoolYear');
    const bank = await getPublishedOrJson({
      schoolYear: form ? inferSchoolYear(form) : undefined,
      version: form?.questionBankVersion,
    });
    if (bank?.steps?.length) return bank;
  } catch (error) {
    console.warn('Could not load published question bank, falling back to JSON:', error.message);
  }

  try {
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'data', 'formQuestions.json'),
      path.join(process.cwd(), 'data', 'formQuestions.json'),
    ];
    for (const formQuestionsPath of possiblePaths) {
      if (fs.existsSync(formQuestionsPath)) {
        return JSON.parse(fs.readFileSync(formQuestionsPath, 'utf8'));
      }
    }
  } catch (error) {
    console.error('Error loading form questions JSON fallback:', error);
  }

  return { steps: [] };
}

// Helper function to get question title by field ID
function getQuestionTitle(formQuestionsData, stepKey, fieldId) {
  try {
    const step = formQuestionsData.steps.find(s => s.key === stepKey);
    if (!step) return fieldId;
    
    const question = step.questions.find(q => q.id === fieldId);
    return question ? question.title : fieldId;
  } catch (error) {
    console.error(`Error getting question title for ${stepKey}.${fieldId}:`, error);
    return fieldId;
  }
}

// GET /api/forms/[id]/export/docx - Generate editable DOCX
async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const form = await FormSubmission.findById(id)
      .populate('userId', 'name email level');

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Get user from database to check assigned forms
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const formUserId = form.userId?._id?.toString() || form.userId?.toString();
    const isOwner = formUserId === user._id.toString();
    const isSuperAdmin = user.level === 5;
    const isPrincipal = user.level === 4;
    const isAssistantPrincipal = user.level === 3;
    // Level 4 users can access forms from their school
    const isSameSchool = isPrincipal && user.schoolName && form.schoolName && 
                         user.schoolName === form.schoolName;
    // Level 3 users can access if assigned to the form
    const isAssigned = user.assignedForms.some(assignment => 
      assignment.formId.toString() === form._id.toString()
    );
    // Check if form is shared with this user's email
    const isSharedWithEmail = form.sharedWithEmails && form.sharedWithEmails.some(
      share => share.email.toLowerCase() === user.email.toLowerCase()
    );

    if (!isOwner && !isSuperAdmin && !isSameSchool && !isAssigned && !isSharedWithEmail) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Load form questions
    const formQuestionsData = await loadFormQuestions(form);

    // Create document sections
    const children = [];

    // Title
    children.push(
      new Paragraph({
        text: `${form.schoolName} - Consolidated Plan`,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Header info
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Principal: ${form.principalName || 'N/A'}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Status: ${form.status || 'Draft'}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Form steps data
    const stepNames = (formQuestionsData.steps || []).map((step, index) => ({
      key: step.key,
      title: `Step ${index + 1}: ${step.title}`,
    }));

    stepNames.forEach((step) => {
      const stepData = form.formData?.[step.key]?.data || {};

      // Step title
      children.push(
        new Paragraph({
          text: step.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      // Step content - show all questions from formQuestions.json
      const stepQuestions = formQuestionsData.steps.find(s => s.key === step.key);
      const questions = visibleQuestions(stepQuestions?.questions || [], stepData);
      
      if (questions.length > 0) {
        // Show all questions, whether they have data or not
        questions.forEach((question) => {
          const questionId = question.id;
          const questionTitle = question.title || questionId;
          const value = stepData[questionId];
          const table = resolveExportTable(value, question.columns, {
            always: question.type === 'table',
          });
          const hasData = table
            ? isTableAnswered(table)
            : question.type === 'yesno'
              ? Boolean(formatYesNo(value))
              : value !== undefined && value !== null && value !== '';
          
          let displayValue = '';
          
          if (!table && hasData) {
            if (question.type === 'yesno') {
              displayValue = formatYesNo(value);
            } else if (typeof value === 'object' && value !== null) {
              if (Array.isArray(value)) {
                displayValue = value.join(', ');
              } else {
                displayValue = JSON.stringify(value, null, 2);
              }
            } else {
              displayValue = String(value || '');
            }
          } else if (!table) {
            displayValue = '_______________________________________________________';
          }
          
          const questionNum = question.question_number ? `Q${question.question_number}: ` : '';
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${questionNum}${questionTitle}`, bold: true }),
              ],
              spacing: { after: table ? 80 : 80 },
            })
          );

          if (table) {
            children.push(buildDocxTable(table));
            children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
          } else {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: displayValue,
                    ...(hasData ? {} : { color: '808080' }),
                  }),
                ],
                spacing: { after: hasData ? 200 : 300 },
              })
            );
          }
        });
      } else {
        // Fallback: if we can't find questions, show data that exists
        if (Object.keys(stepData).length > 0) {
          Object.entries(stepData).forEach(([key, value]) => {
            const questionTitle = getQuestionTitle(formQuestionsData, step.key, key);
            const table = resolveExportTable(value);
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `${questionTitle}`, bold: true })],
                spacing: { after: 80 },
              })
            );
            if (table) {
              children.push(buildDocxTable(table));
              children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            } else {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || ''),
                    }),
                  ],
                  spacing: { after: 200 },
                })
              );
            }
          });
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'No questions found for this step.', italics: true, color: '808080' }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      }

      // Page break between steps (except last)
      if (step !== stepNames[stepNames.length - 1]) {
        children.push(
          new Paragraph({
            text: '',
            pageBreakBefore: true,
          })
        );
      }
    });

    // Footer
    children.push(
      new Paragraph({
        text: `Form ID: ${form._id} | Generated: ${new Date().toLocaleDateString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    );

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);

    // Return DOCX as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${form.schoolName.replace(/[^a-z0-9]/gi, '_')}_Consolidated_Plan.docx"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json({ error: 'Failed to generate DOCX' }, { status: 500 });
  }
}

module.exports = { GET };

