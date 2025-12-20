const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const FormSubmission = require('../../../../../../models/FormSubmission');
const User = require('../../../../../../models/User');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const path = require('path');
const fs = require('fs');

// Helper function to load form questions
function loadFormQuestions() {
  let formQuestionsData = { steps: [] };
  try {
    // Try multiple possible paths for the JSON file
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'data', 'formQuestions.json'),
      path.join(process.cwd(), 'data', 'formQuestions.json'),
      path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', '..', 'data', 'formQuestions.json'),
      path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', '..', '..', '..', 'data', 'formQuestions.json'),
    ];
    
    let loaded = false;
    for (const formQuestionsPath of possiblePaths) {
      try {
        if (fs.existsSync(formQuestionsPath)) {
          const fileContent = fs.readFileSync(formQuestionsPath, 'utf8');
          formQuestionsData = JSON.parse(fileContent);
          console.log('Successfully loaded form questions from:', formQuestionsPath);
          loaded = true;
          break;
        } else {
          console.log('Path does not exist:', formQuestionsPath);
        }
      } catch (pathError) {
        console.error(`Error trying path ${formQuestionsPath}:`, pathError.message);
        // Try next path
        continue;
      }
    }
    
    if (!loaded) {
      console.warn('Could not load formQuestions.json from any path, will use field IDs as labels');
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
    }
  } catch (error) {
    console.error('Error loading form questions:', error);
    console.error('Error stack:', error.stack);
  }
  return formQuestionsData;
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
    const formQuestionsData = loadFormQuestions();

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
    const stepNames = [
      { key: 'tableOfContents', title: 'Step 1: Table of Contents' },
      { key: 'childAbuseIntervention', title: 'Step 2: Child Abuse and Neglect Intervention' },
      { key: 'sexualHarassment', title: 'Step 3: Student to Student Sexual Harassment' },
      { key: 'respectForAll', title: 'Step 4: Respect For All Plan' },
      { key: 'suicidePrevention', title: 'Step 5: Suicide Prevention and Crisis Intervention' },
      { key: 'attendancePlan', title: 'Step 6: School Attendance Plan' },
      { key: 'temporaryHousing', title: 'Step 7: Students in Temporary Housing Program' },
      { key: 'serviceInSchools', title: 'Step 8: Service In Schools Plan' },
      { key: 'planningInterviews', title: 'Step 9: Planning Interviews' },
      { key: 'militaryRecruitment', title: 'Step 10: Military Recruitment Opt-Out' },
      { key: 'schoolCulture', title: 'Step 11: School Culture Plan' },
      { key: 'afterSchoolPrograms', title: 'Step 12: After School Programs' },
      { key: 'cellPhonePolicy', title: 'Step 13: Cell Phone Policy' },
      { key: 'counselingPlan', title: 'Step 14: School Counseling Plan' }
    ];

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
      const questions = stepQuestions?.questions || [];
      
      if (questions.length > 0) {
        // Show all questions, whether they have data or not
        questions.forEach((question) => {
          const questionId = question.id;
          const questionTitle = question.title || questionId;
          const hasData = stepData[questionId] !== undefined && stepData[questionId] !== null && stepData[questionId] !== '';
          
          let displayValue = '';
          
          if (hasData) {
            const value = stepData[questionId];
            if (typeof value === 'object' && value !== null) {
              if (Array.isArray(value)) {
                displayValue = value.join(', ');
              } else {
                displayValue = JSON.stringify(value, null, 2);
              }
            } else {
              displayValue = String(value || '');
            }
          } else {
            // No data - show empty line for user to fill in
            displayValue = '_______________________________________________________';
          }
          
          const questionNum = question.question_number ? `Q${question.question_number}: ` : '';
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${questionNum}${questionTitle}: `, bold: true }),
                new TextRun({ 
                  text: displayValue,
                  ...(hasData ? {} : { color: '808080' }) // Gray for empty fields
                }),
              ],
              spacing: { after: hasData ? 200 : 300 }, // More space for empty fields
            })
          );
        });
      } else {
        // Fallback: if we can't find questions, show data that exists
        if (Object.keys(stepData).length > 0) {
          Object.entries(stepData).forEach(([key, value]) => {
            const questionTitle = getQuestionTitle(formQuestionsData, step.key, key);
            const displayValue = typeof value === 'object' 
              ? JSON.stringify(value, null, 2) 
              : String(value || '');

            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${questionTitle}: `, bold: true }),
                  new TextRun({ text: displayValue }),
                ],
                spacing: { after: 200 },
              })
            );
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

