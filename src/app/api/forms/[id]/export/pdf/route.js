const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const FormSubmission = require('../../../../../../models/FormSubmission');
const User = require('../../../../../../models/User');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

// Require PDFKit at module level - should be externalized by webpack config
// This is a Node.js-only package, so it should not be bundled
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  console.error('Failed to require pdfkit:', e);
  // Will throw error when trying to use it
}

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

// GET /api/forms/[id]/export/pdf - Generate PDF
async function GET(request, { params }) {
  let form = null;
  let formId = null;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    formId = id;
    form = await FormSubmission.findById(id)
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

    // Check if PDFDocument is available
    if (!PDFDocument) {
      throw new Error('PDFKit is not available. Please ensure pdfkit and iconv-lite are installed.');
    }

    // Create PDF document
    // Note: PDFKit uses built-in fonts (Helvetica, Times-Roman, Courier)
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      autoFirstPage: true
    });

    // Create a stream to collect PDF data
    const chunks = [];
    let pdfError = null;
    let pdfEnded = false;
    let pdfResolve, pdfReject;
    
    // Set up promise to wait for PDF completion
    const pdfPromise = new Promise((resolve, reject) => {
      pdfResolve = resolve;
      pdfReject = reject;
      
      // Collect PDF chunks
      doc.on('data', chunk => {
        chunks.push(chunk);
      });
      
      doc.on('end', () => {
        pdfEnded = true;
        if (pdfError) {
          reject(pdfError);
        } else if (chunks.length === 0) {
          reject(new Error('PDF generation completed but buffer is empty'));
        } else {
          resolve();
        }
      });
      
      doc.on('error', (err) => {
        pdfError = err;
        console.error('PDF generation error:', err);
        reject(err);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!pdfEnded) {
          reject(new Error('PDF generation timeout'));
        }
      }, 30000);
    });

    // Header - wrap in try-catch to handle any errors
    try {
      // Ensure we're using a valid font and escape special characters
      doc.font('Helvetica');
      const safeSchoolName = String(form.schoolName || 'School').replace(/[^\x20-\x7E]/g, '');
      const safePrincipalName = String(form.principalName || 'N/A').replace(/[^\x20-\x7E]/g, '');
      const safeStatus = String(form.status || 'Draft').replace(/[^\x20-\x7E]/g, '');
      
      doc.fontSize(20).text(`${safeSchoolName} - Consolidated Plan`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Principal: ${safePrincipalName}`, { align: 'center' });
      doc.fontSize(10).text(`Status: ${safeStatus}`, { align: 'center' });
      doc.moveDown(2);

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

      stepNames.forEach((step, index) => {
        if (index > 0) {
          doc.addPage();
        }

        const stepData = form.formData?.[step.key]?.data || {};
        
        doc.font('Helvetica-Bold').fontSize(16).text(step.title, { underline: true });
        doc.moveDown();

        // Get all questions for this step from formQuestions.json
        const stepQuestions = formQuestionsData.steps.find(s => s.key === step.key);
        const questions = stepQuestions?.questions || [];
        
        doc.fontSize(10).font('Helvetica');
        
        if (questions.length > 0) {
          // Show all questions, whether they have data or not
          questions.forEach((question) => {
            try {
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
                
                // Truncate very long values to prevent PDF errors
                if (displayValue.length > 5000) {
                  displayValue = displayValue.substring(0, 5000) + '... (truncated)';
                }
              } else {
                // No data - show empty line for user to fill in
                displayValue = '_______________________________________________________';
              }
              
              // Use safe font names that PDFKit supports
              try {
                // Escape special characters that might cause issues
                const safeLabel = String(questionTitle).replace(/[^\x20-\x7E\n\r]/g, '');
                const safeValue = String(displayValue).replace(/[^\x20-\x7E\n\r]/g, '');
                
                // Show question number if available
                const questionNum = question.question_number ? `Q${question.question_number}: ` : '';
                
                doc.font('Helvetica-Bold').text(`${questionNum}${safeLabel}:`, { continued: false });
                if (hasData) {
                  doc.font('Helvetica').text(safeValue, { indent: 20 });
                } else {
                  // For empty fields, show a line and extra space
                  doc.font('Helvetica').text(safeValue, { indent: 20 });
                  doc.moveDown(0.3); // Extra space for writing
                }
                doc.moveDown(0.8);
              } catch (textError) {
                // If text rendering fails, try with simpler approach
                console.error(`Text rendering error for ${questionTitle}:`, textError);
                try {
                  const questionNum = question.question_number ? `Q${question.question_number}: ` : '';
                  doc.font('Helvetica').text(`${questionNum}${String(questionTitle)}: ${String(displayValue)}`, { indent: 20 });
                  doc.moveDown(0.8);
                } catch (fallbackError) {
                  console.error(`Fallback text rendering also failed:`, fallbackError);
                  // Skip this question if even fallback fails
                }
              }
            } catch (questionError) {
              console.error(`Error processing question ${question.id}:`, questionError);
              // Skip this question and continue
            }
          });
        } else {
          // Fallback: if we can't find questions, show data that exists
          if (Object.keys(stepData).length > 0) {
            Object.entries(stepData).forEach(([key, value]) => {
              try {
                const questionTitle = getQuestionTitle(formQuestionsData, step.key, key);
                let displayValue = '';
                
                if (typeof value === 'object' && value !== null) {
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  } else {
                    displayValue = JSON.stringify(value, null, 2);
                  }
                } else {
                  displayValue = String(value || '');
                }
                
                const safeLabel = String(questionTitle || key).replace(/[^\x20-\x7E\n\r]/g, '');
                const safeValue = String(displayValue).replace(/[^\x20-\x7E\n\r]/g, '');
                
                doc.font('Helvetica-Bold').text(`${safeLabel}:`, { continued: false });
                doc.font('Helvetica').text(safeValue, { indent: 20 });
                doc.moveDown(0.5);
              } catch (fieldError) {
                console.error(`Error processing field ${key}:`, fieldError);
              }
            });
          } else {
            doc.fontSize(10).font('Helvetica').text('No questions found for this step.', { color: 'gray' });
          }
        }
      });
    } catch (contentError) {
      console.error('Error adding content to PDF:', contentError);
      pdfError = contentError;
      // If there's an error, reject the promise immediately
      if (pdfReject) {
        pdfReject(contentError);
      }
      throw contentError; // Re-throw to be caught by outer catch
    }

    // Finalize PDF only if no errors occurred
    if (!pdfError) {
      doc.end();
      
      // Wait for PDF to complete
      await pdfPromise;
    } else {
      throw pdfError;
    }

    // Combine chunks into buffer
    const pdfBuffer = Buffer.concat(chunks);

    if (pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(form.schoolName || 'form').replace(/[^a-z0-9]/gi, '_')}_Consolidated_Plan.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      formId: formId,
      formSchoolName: form?.schoolName
    });
    
    // Return more detailed error in development
    const errorResponse = {
      error: 'Failed to generate PDF',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: {
          name: error.name,
          formId: formId
        }
      })
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

module.exports = { GET };

