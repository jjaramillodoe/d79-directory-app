'use client';

import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  User, 
  Building2, 
  Calendar,
  Clock,
  Award,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import useQuestionBank from '../hooks/useQuestionBank';
import useAppToast from '../hooks/useAppToast';
import { TableDisplay } from './form-steps/TableAnswerField';
import { isTableValue } from '../lib/tableAnswer';
import { visibleQuestions, formatYesNo, isGateQuestion } from '../lib/questionBankUtils';
import QuestionPrompt from './QuestionPrompt';

const FormViewer = ({ form }) => {
  const { questionBank } = useQuestionBank();
  const toast = useAppToast();
  // Format checkbox values to show "Confirmed" instead of "true"
  const formatValue = (value, question) => {
    const type = question?.type;
    if (type === 'checkbox' || (type === 'yesno' && isGateQuestion(question))) {
      const yesNo = formatYesNo(value);
      if (yesNo) return yesNo;
      if (value === true) return 'Yes';
      if (value === false) return 'No';
      if (type === 'checkbox' && !isGateQuestion(question)) return 'Not Confirmed';
      return 'No';
    }
    if (type === 'yesno') {
      return formatYesNo(value) || 'No response provided';
    }
    if (type === 'table' || isTableValue(value)) {
      return <TableDisplay value={value} columns={question?.columns} />;
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value || 'No response provided';
  };

  // Check if a step has data
  const hasStepData = (stepKey) => {
    const stepData = form.formData?.[stepKey];
    return stepData?.data && Object.keys(stepData.data).length > 0;
  };

  // Get step completion status
  const isStepCompleted = (stepKey) => {
    return form.formData?.[stepKey]?.completed === true;
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      // Check if required libraries are available
      if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        toast.error('PDF export libraries not loaded. Refresh the page and try again.');
        return;
      }

      const element = document.getElementById('form-viewer-content');
      if (!element) {
        console.error('Form viewer content element not found');
        toast.error('Could not find form content to export');
        return;
      }

      // Show loading message
      console.log('Starting PDF generation...');
      console.log('Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled
      });

      // Create a temporary container for better PDF formatting
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px'; // Fixed width for consistent PDF
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.4';
      
      // Clone the content and remove problematic SVG elements
      const clonedContent = element.cloneNode(true);
      
      // Remove or replace problematic SVG elements that might cause issues
      const removeProblematicElements = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Remove SVG elements that might have read-only properties
          if (node.tagName === 'svg') {
            // Replace SVG with a placeholder div
            const placeholder = document.createElement('div');
            placeholder.textContent = '[Icon]';
            placeholder.style.display = 'inline-block';
            placeholder.style.width = '20px';
            placeholder.style.height = '20px';
            placeholder.style.backgroundColor = '#f0f0f0';
            placeholder.style.border = '1px solid #ccc';
            placeholder.style.textAlign = 'center';
            placeholder.style.fontSize = '10px';
            placeholder.style.lineHeight = '20px';
            placeholder.style.margin = '0 5px';
            placeholder.style.verticalAlign = 'middle';
            
            if (node.parentNode) {
              node.parentNode.replaceChild(placeholder, node);
            }
            return;
          }
          
          // Process children
          if (node.children) {
            // Create a copy of children array to avoid modification during iteration
            const children = Array.from(node.children);
            children.forEach(removeProblematicElements);
          }
        }
      };
      
      removeProblematicElements(clonedContent);
      
      // Clean up the cloned content for PDF
      const cleanForPDF = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this is an SVG element or has SVG children
          const isSVGElement = node.tagName === 'svg' || 
                               node.tagName === 'path' || 
                               node.tagName === 'circle' || 
                               node.tagName === 'rect' || 
                               node.tagName === 'line' || 
                               node.tagName === 'polygon' ||
                               node.tagName === 'g' ||
                               node.tagName === 'text' ||
                               node.tagName === 'foreignObject';
          
          // For SVG elements, only process children, don't modify properties
          if (isSVGElement) {
            if (node.children) {
              Array.from(node.children).forEach(cleanForPDF);
            }
            return;
          }

          // For regular HTML elements, safely modify properties
          try {
            // Remove print-specific classes
            if (node.className) {
              if (typeof node.className === 'string') {
                node.className = node.className.replace(/print:/g, '');
              } else if (typeof node.className.toString === 'function') {
                const className = node.className.toString();
                node.className = className.replace(/print:/g, '');
              }
            }
          } catch (error) {
            console.warn('Cannot modify className on element:', node.tagName, error.message);
          }
          
          try {
            // Ensure text colors are readable
            if (node.style && node.style.color) {
              node.style.color = '#000000';
            }
          } catch (error) {
            console.warn('Cannot modify style.color on element:', node.tagName, error.message);
          }
          
          try {
            // Ensure background colors are white
            if (node.style && node.style.backgroundColor && node.style.backgroundColor !== 'white') {
              node.style.backgroundColor = 'white';
            }
          } catch (error) {
            console.warn('Cannot modify style.backgroundColor on element:', node.tagName, error.message);
          }
          
          // Process children
          if (node.children) {
            Array.from(node.children).forEach(cleanForPDF);
          }
        }
      };
      
      cleanForPDF(clonedContent);
      tempContainer.appendChild(clonedContent);
      document.body.appendChild(tempContainer);

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempContainer.scrollHeight,
        logging: false, // Disable console logging
        ignoreElements: (element) => {
          // Skip problematic SVG elements that might cause issues
          return element.tagName === 'svg' && element.querySelector('defs');
        }
      });

      // Clean up temporary container
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }

      // Create PDF
      console.log('Converting canvas to image...');
      const imgData = canvas.toDataURL('image/png');
      console.log('Image data length:', imgData.length);
      
      console.log('Creating PDF document...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      console.log('PDF dimensions:', { pdfWidth, pdfHeight, imgWidth, imgHeight });
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20); // Account for margins

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      // Save PDF with improved download handling
      const fileName = `School-Plan-Form-${form.schoolName?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      console.log('Attempting to download PDF:', fileName);
      console.log('PDF size:', pdf.internal.getNumberOfPages(), 'pages');
      
      // Check if browser supports downloads
      const supportsDownload = 'download' in document.createElement('a');
      console.log('Browser supports download attribute:', supportsDownload);
      
      try {
        // Method 1: Try direct save first (most reliable)
        console.log('Trying pdf.save() method...');
        pdf.save(fileName);
        console.log('PDF download initiated via pdf.save()');
        
        // Give it a moment, then show success message
        setTimeout(() => {
          console.log('PDF export completed successfully!');
          toast.success(`PDF downloaded: ${fileName}`);
        }, 1000);
        
      } catch (saveError) {
        console.error('pdf.save() failed, trying alternative method:', saveError);
        
        // Method 2: Alternative download using blob
        try {
          const pdfBlob = pdf.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          
          console.log('PDF download initiated via blob method');
          toast.success(`PDF downloaded: ${fileName}`);
          
        } catch (blobError) {
          console.error('Blob method failed, trying data URI:', blobError);
          
          // Method 3: Fallback to data URI
          const pdfDataUri = pdf.output('datauristring');
          const link = document.createElement('a');
          link.href = pdfDataUri;
          link.download = fileName;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log('PDF download initiated via data URI method');
          toast.success(`PDF generated: ${fileName}`);
        }
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error generating PDF: ${error.message || 'Please try again.'}`);
    }
  };

  // Enhanced print function
  const handlePrint = () => {
    // Add print-specific styles temporarily
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #form-viewer-content, #form-viewer-content * { visibility: visible; }
        #form-viewer-content { 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%; 
          height: auto;
          background: white !important;
          color: black !important;
        }
        .print-break { page-break-before: always; }
        .print-no-break { page-break-inside: avoid; }
        .print-break-after { page-break-after: always; }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    // Remove temporary styles after printing
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1000);
  };

  return (
    <div id="form-viewer-content" className="space-y-8 print-space-y-4">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-100 border-2 border-blue-200 rounded-xl p-6 print-break-inside-avoid print-no-break">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 print-hidden">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            School Plan Form - Approved
          </h1>
          <p className="text-blue-600 text-lg">
            Official Approved Submission
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">School:</span>
              <span className="text-blue-700">{form.schoolName || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Principal:</span>
              <span className="text-blue-700">{form.principalName || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Status:</span>
              <span className="text-green-600 font-semibold">✓ APPROVED</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Created:</span>
              <span className="text-blue-700">
                {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'Not specified'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Submitted:</span>
              <span className="text-blue-700">
                {form.submittedAt ? new Date(form.submittedAt).toLocaleDateString() : 'Not specified'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Progress:</span>
              <span className="text-blue-700">
                {form.completedSteps?.length || 0}/14 steps completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Steps */}
      {questionBank.steps.map((step, index) => {
        const stepKey = step.key;
        const stepData = form.formData?.[stepKey];
        const answers = stepData?.data || {};
        const questions = visibleQuestions(step.questions || [], answers).filter((question) => {
          const answer = answers[question.id];
          const hasAnswer = answer !== undefined && answer !== null && answer !== '';
          return hasAnswer;
        });
        const knownIds = new Set((step.questions || []).map((question) => question.id));
        Object.keys(answers).forEach((id) => {
          if (knownIds.has(id)) return;
          const answer = answers[id];
          if (answer === undefined || answer === null || answer === '') return;
          questions.push({
            id,
            title: id,
            type: typeof answer === 'boolean' ? 'checkbox' : 'textarea',
          });
        });
        
        if (!hasStepData(stepKey)) {
          return null; // Skip steps with no data
        }

        return (
          <div key={stepKey} className={`border-2 border-gray-200 rounded-xl p-6 print-break-inside-avoid print-no-break ${index > 0 ? 'print-break' : ''}`}>
            {/* Step Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isStepCompleted(stepKey) 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-400 text-white'
              }`}>
                {isStepCompleted(stepKey) ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Step {step.id}: {step.title}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isStepCompleted(stepKey)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isStepCompleted(stepKey) ? '✓ Completed' : '⚠ Incomplete'}
                  </span>
                  {stepData?.lastUpdated && (
                    <span className="text-sm text-gray-600">
                      Last updated: {new Date(stepData.lastUpdated).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step Questions and Answers */}
            <div className="space-y-6">
              {questions.map((question) => {
                const answer = stepData.data?.[question.id];
                const hasAnswer = answer !== undefined && answer !== null && answer !== '';
                
                if (!hasAnswer) return null; // Skip questions with no answer

                return (
                  <div key={question.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 print-no-break">
                    <div className="mb-3">
                      <QuestionPrompt question={question} />
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-300">
                      <div className="text-gray-700">
                        {formatValue(answer, question)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Print Footer */}
      <div className="text-center text-gray-500 text-sm print-break-inside-avoid print-break">
        <p>This form was approved on {form.reviewedAt ? new Date(form.reviewedAt).toLocaleDateString() : 'recently'}</p>
        <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Action Buttons - Hidden during print */}
      <div className="flex justify-center gap-4 pt-6 print-hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Print Form
        </button>
        <button
          onClick={exportToPDF}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default FormViewer;
