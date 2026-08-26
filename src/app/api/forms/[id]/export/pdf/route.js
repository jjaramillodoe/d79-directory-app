import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import FormSubmission from '../../../../../../models/FormSubmission';
import User from '../../../../../../models/User';
import { getPublishedOrJson } from '../../../../../../lib/questionBank';
import { visibleQuestions } from '../../../../../../lib/questionBankUtils';
import { resolveExportTable, resolveExportAnswer, drawPdfTable, pdfSafe } from '../../../../../../lib/exportTables';
import { splitFormattedText } from '../../../../../../lib/linkifyText';
import { splitCopyBlocks } from '../../../../../../lib/formattedCopy';
import { canViewForm } from '../../../../../../lib/formAccess';
import { enforceRateLimit } from '../../../../../../lib/userAccess';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import { reportError } from '../../../../../../lib/reportError';
import { inferSchoolYear } from '../../../../../../lib/schoolYear';

// The one deliberate `require` left in the API routes, which are otherwise all ESM imports.
// It cannot become an `import` for two reasons: the CJS entry has to be addressed directly
// because the ESM one pulls fontkit through Turbopack and breaks @swc/helpers, and the call
// needs to sit inside a try/catch so a missing or broken pdfkit degrades to a reported error
// instead of taking the whole route module down at load time. A static import does neither.
let PDFDocument;
try {
  PDFDocument = require('pdfkit/js/pdfkit.js');
} catch (e) {
  reportError(e, { route: '/api/forms/[id]/export/pdf', detail: 'Failed to require pdfkit' });
}

// Helper function to load form questions
async function loadFormQuestions(form) {
  try {
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
    reportError(error, { route: '/api/forms/[id]/export/pdf', detail: 'Error loading form questions JSON fallback' });
  }

  return { steps: [] };
}

function writeFormattedPdfText(doc, text, { bold = false } = {}) {
  const parts = splitFormattedText(text).filter((part) => part.text);
  if (!parts.length) {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('black').text('');
    return;
  }

  parts.forEach((part, index) => {
    const last = index === parts.length - 1;
    const font = bold || part.bold ? 'Helvetica-Bold' : 'Helvetica';
    const options = { continued: !last };
    doc.font(font);
    if (part.type === 'url') {
      doc.fillColor('#1d4ed8').text(pdfSafe(part.text) || ' ', {
        ...options,
        link: part.href,
        underline: true,
      });
    } else {
      doc.fillColor('black').text(pdfSafe(part.text) || ' ', options);
    }
  });
  doc.fillColor('black');
}

function writeIntroPdf(doc, intro) {
  const blocks = splitCopyBlocks(intro);
  if (!blocks.length) return;
  doc.fontSize(10).font('Helvetica');
  blocks.forEach((block) => {
    if (block.type === 'ul' || block.type === 'ol') {
      block.items.forEach((item, index) => {
        const prefix = block.type === 'ol' ? `${index + 1}. ` : '• ';
        writeFormattedPdfText(doc, `${prefix}${item}`);
        doc.moveDown(0.15);
      });
    } else {
      writeFormattedPdfText(doc, block.text);
      doc.moveDown(0.35);
    }
  });
  doc.moveDown(0.5);
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
export async function GET(request, { params }) {
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

    // PDF generation is the most expensive operation in the app; cap it per user.
    const limited = await enforceRateLimit(`rl:export-pdf:${user._id}`, 10, 60);
    if (limited) return limited;

    if (!canViewForm(user, form)) {
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
        reportError(err, { route: '/api/forms/[id]/export/pdf', detail: 'PDF generation error' });
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
        if (stepQuestions?.intro) {
          writeIntroPdf(doc, stepQuestions.intro);
        }
        const questions = visibleQuestions(stepQuestions?.questions || [], stepData);
        
        doc.fontSize(10).font('Helvetica');
        
        if (questions.length > 0) {
          // Show all questions, whether they have data or not
          questions.forEach((question) => {
            try {
              const questionId = question.id;
              const questionTitle = question.title || questionId;
              const value = stepData[questionId];
              const { table, hasData, displayValue } = resolveExportAnswer(question, value, {
                maxLength: 5000,
              });
              
              try {
                const questionNum = question.question_number ? `Q${question.question_number}: ` : '';

                writeFormattedPdfText(doc, `${questionNum}${questionTitle}`, { bold: true });
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
                  reportError(fallbackError, { route: '/api/forms/[id]/export/pdf', detail: `Fallback text rendering also failed:` });
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
      reportError(contentError, { route: '/api/forms/[id]/export/pdf', detail: 'Error adding content to PDF' });
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
    reportError(error, { route: '/api/forms/[id]/export/pdf', detail: 'Error generating PDF' });
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      formId: formId,
      formSchoolName: form?.schoolName
    });
    
    // Detail stays in the server log; only development gets it over the wire.
    const errorResponse = {
      error: 'Failed to generate PDF',
      ...(process.env.NODE_ENV === 'development' && {
        message: error.message,
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
