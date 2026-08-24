const { NextResponse } = require('next/server');
const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../../../../../../lib/auth');
const connectDB = require('../../../../../../lib/mongodb');
const FormSubmission = require('../../../../../../models/FormSubmission');
const User = require('../../../../../../models/User');
const { getPublishedOrJson } = require('../../../../../../lib/questionBank');
const { isTableAnswered } = require('../../../../../../lib/tableAnswer');
const { visibleQuestions, formatYesNo } = require('../../../../../../lib/questionBankUtils');
const { resolveExportTable, drawPdfTable, pdfSafe } = require('../../../../../../lib/exportTables');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

// Require PDFKit at module level - should be externalized by webpack config
// This is a Node.js-only package, so it should not be bundled
let PDFDocument;
try {
  // CJS build — the ESM entry pulls fontkit through Turbopack and breaks @swc/helpers.
  PDFDocument = require('pdfkit/js/pdfkit.js');
} catch (e) {
  console.error('Failed to require pdfkit:', e);
}

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
    const formQuestionsData = await loadFormQuestions(form);

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
      const stepNames = (formQuestionsData.steps || []).map((step, index) => ({
        key: step.key,
        title: `Step ${index + 1}: ${step.title}`,
      }));

      stepNames.forEach((step, index) => {
        if (index > 0) {
          doc.addPage();
        }

        const stepData = form.formData?.[step.key]?.data || {};
        
        doc.font('Helvetica-Bold').fontSize(16).text(step.title, { underline: true });
        doc.moveDown();

        // Get all questions for this step from formQuestions.json
        const stepQuestions = formQuestionsData.steps.find(s => s.key === step.key);
        const questions = visibleQuestions(stepQuestions?.questions || [], stepData);
        
        doc.fontSize(10).font('Helvetica');
        
        if (questions.length > 0) {
          // Show all questions, whether they have data or not
          questions.forEach((question) => {
            try {
              const questionId = question.id;
              const questionTitle = question.title || questionId;
              const value = stepData[questionId];
              const table = resolveExportTable(value, question.columns, {
                always: question.type === 'table',
              });
              const hasData = table
                ? isTableAnswered(table)
                : question.type === 'yesno' || question.type === 'checkbox'
                  ? Boolean(formatYesNo(value))
                  : value !== undefined && value !== null && value !== '';
              
              let displayValue = '';
              
              if (!table && hasData) {
                if (question.type === 'yesno' || question.type === 'checkbox') {
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
                
                if (displayValue.length > 5000) {
                  displayValue = displayValue.substring(0, 5000) + '... (truncated)';
                }
              } else if (!table) {
                displayValue = '_______________________________________________________';
              }
              
              try {
                const safeLabel = pdfSafe(questionTitle);
                const questionNum = question.question_number ? `Q${question.question_number}: ` : '';
                
                doc.font('Helvetica-Bold').text(`${questionNum}${safeLabel}`, { continued: false });
                if (table) {
                  doc.moveDown(0.3);
                  drawPdfTable(doc, table);
                } else {
                  const safeValue = pdfSafe(displayValue);
                  doc.font('Helvetica').text(safeValue, { indent: 20 });
                  if (!hasData) doc.moveDown(0.3);
                  doc.moveDown(0.8);
                }
              } catch (textError) {
                // If text rendering fails, try with simpler approach
                console.error(`Text rendering error for ${questionTitle}:`, textError);
                try {
                  const questionNum = question.question_number ? `Q${question.question_number}: ` : '';
                  if (table) {
                    drawPdfTable(doc, table);
                  } else {
                    doc.font('Helvetica').text(`${questionNum}${String(questionTitle)}: ${String(displayValue)}`, { indent: 20 });
                    doc.moveDown(0.8);
                  }
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
                const table = resolveExportTable(value);
                const safeLabel = pdfSafe(questionTitle || key);
                doc.font('Helvetica-Bold').text(`${safeLabel}`, { continued: false });
                if (table) {
                  doc.moveDown(0.3);
                  drawPdfTable(doc, table);
                } else {
                  let displayValue = '';
                  if (typeof value === 'object' && value !== null) {
                    displayValue = Array.isArray(value) ? value.join(', ') : JSON.stringify(value, null, 2);
                  } else {
                    displayValue = String(value || '');
                  }
                  doc.font('Helvetica').text(pdfSafe(displayValue), { indent: 20 });
                  doc.moveDown(0.5);
                }
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

