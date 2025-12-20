'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FileText,
  Printer,
  Download,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  User,
  Calendar,
  School,
} from 'lucide-react';
import Link from 'next/link';

// Import form step components
import Step1TableOfContents from '../../../components/form-steps/Step1TableOfContents';
import Step3ChildAbusePreventionPlan from '../../../components/form-steps/Step3ChildAbusePreventionPlan';
import Step4StudenttoStudentSexualHarassment from '../../../components/form-steps/Step4StudenttoStudentSexualHarassment';
import Step5RespectForAllPlan from '../../../components/form-steps/Step5RespectForAllPlan';
import Step6SchoolCrisisInterventionPlan from '../../../components/form-steps/Step6SchoolCrisisInterventionPlan';
import Step7SchoolAttendancePlan from '../../../components/form-steps/Step7SchoolAttendancePlan';
import Step8StudentsinTemporaryHousingProgramPlan from '../../../components/form-steps/Step8StudentsinTemporaryHousingProgramPlan';
import Step9ServiceInSchoolsPlan from '../../../components/form-steps/Step9ServiceInSchoolsPlan';
import Step10PlanningInterviews from '../../../components/form-steps/Step10PlanningInterviews';
import Step11MilitaryRecruitmentOptOut from '../../../components/form-steps/Step11MilitaryRecruitmentOptOut';
import Step12SchoolCulturePlan from '../../../components/form-steps/Step12SchoolCulturePlan';
import Step13AfterSchoolPrograms from '../../../components/form-steps/Step13AfterSchoolPrograms';
import Step14CellPhonePolicy from '../../../components/form-steps/Step14CellPhonePolicy';
import Step15SchoolCounselingPlan from '../../../components/form-steps/Step15SchoolCounselingPlan';

const FORM_STEPS = [
  { id: 1, title: 'Table of Contents', key: 'tableOfContents' },
  { id: 2, title: 'Child Abuse and Neglect Intervention', key: 'childAbuseIntervention' },
  { id: 3, title: 'Student to Student Sexual Harassment', key: 'sexualHarassment' },
  { id: 4, title: 'Respect For All Plan', key: 'respectForAll' },
  { id: 5, title: 'Suicide Prevention and Crisis Intervention', key: 'suicidePrevention' },
  { id: 6, title: 'School Attendance Plan', key: 'attendancePlan' },
  { id: 7, title: 'Students in Temporary Housing Program', key: 'temporaryHousing' },
  { id: 8, title: 'Service In Schools Plan', key: 'serviceInSchools' },
  { id: 9, title: 'Planning Interviews', key: 'planningInterviews' },
  { id: 10, title: 'Military Recruitment Opt-Out', key: 'militaryRecruitment' },
  { id: 11, title: 'School Culture Plan', key: 'schoolCulture' },
  { id: 12, title: 'After School Programs', key: 'afterSchoolPrograms' },
  { id: 13, title: 'Cell Phone Policy', key: 'cellPhonePolicy' },
  { id: 14, title: 'School Counseling Plan', key: 'counselingPlan' },
];

export default function FormViewPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id;
  const { data: session, status } = useSession();

  const [formData, setFormData] = useState(null);
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingDOCX, setDownloadingDOCX] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    loadFormData();
  }, [session, status, formId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.form) {
        throw new Error('Form not found');
      }

      setFormData(data.form);

      // Initialize step data
      const loadedStepData = data.form.formData || {};
      const stepKeys = [
        'tableOfContents', 'childAbuseIntervention',
        'sexualHarassment', 'respectForAll', 'suicidePrevention',
        'attendancePlan', 'temporaryHousing', 'serviceInSchools',
        'planningInterviews', 'militaryRecruitment', 'schoolCulture',
        'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
      ];
      
      const initializedStepData = {};
      stepKeys.forEach(key => {
        const stepInfo = loadedStepData[key];
        let stepDataObj = {};
        
        if (stepInfo?.data && typeof stepInfo.data === 'object') {
          const nestedKey = Object.keys(stepInfo.data)[0];
          if (nestedKey === key && stepInfo.data[nestedKey]) {
            stepDataObj = stepInfo.data[nestedKey];
          } else {
            stepDataObj = stepInfo.data;
          }
        }
        
        initializedStepData[key] = {
          completed: stepInfo?.completed || false,
          data: stepDataObj,
        };
      });
      
      setStepData(initializedStepData);
    } catch (error) {
      console.error('Error loading form:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await fetch(`/api/forms/${formId}/export/pdf`);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to generate PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        const errorText = await response.text();
        console.error('Unexpected response:', errorText);
        throw new Error('Server returned non-PDF response');
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(formData?.schoolName || 'form').replace(/[^a-z0-9]/gi, '_')}_Consolidated_Plan.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Failed to download PDF: ${error.message}. Please check the console for more details.`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setDownloadingDOCX(true);
    try {
      const response = await fetch(`/api/forms/${formId}/export/docx`);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to generate DOCX';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      // Check if response is actually a DOCX
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('wordprocessingml')) {
        const errorText = await response.text();
        console.error('Unexpected response:', errorText);
        throw new Error('Server returned non-DOCX response');
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('DOCX file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(formData?.schoolName || 'form').replace(/[^a-z0-9]/gi, '_')}_Consolidated_Plan.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert(`Failed to download DOCX: ${error.message}. Please check the console for more details.`);
    } finally {
      setDownloadingDOCX(false);
    }
  };

  const getStepKey = (stepId) => {
    const step = FORM_STEPS.find(s => s.id === stepId);
    return step?.key || `step${stepId}`;
  };

  const renderStep = (step) => {
    const stepKey = step.key;
    const currentStepData = stepData[stepKey]?.data || {};

    // Dummy update function for read-only view
    const dummyUpdate = () => {};

    switch (step.id) {
      case 1:
        return (
          <Step1TableOfContents
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            navigateToStep={() => {}}
            allStepData={stepData}
            currentStep={1}
          />
        );
      case 2:
        return (
          <Step3ChildAbusePreventionPlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={2}
          />
        );
      case 3:
        return (
          <Step4StudenttoStudentSexualHarassment
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={3}
          />
        );
      case 4:
        return (
          <Step5RespectForAllPlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={4}
          />
        );
      case 5:
        return (
          <Step6SchoolCrisisInterventionPlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={5}
          />
        );
      case 6:
        return (
          <Step7SchoolAttendancePlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={6}
          />
        );
      case 7:
        return (
          <Step8StudentsinTemporaryHousingProgramPlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={7}
          />
        );
      case 8:
        return (
          <Step9ServiceInSchoolsPlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={8}
          />
        );
      case 9:
        return (
          <Step10PlanningInterviews
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={9}
          />
        );
      case 10:
        return (
          <Step11MilitaryRecruitmentOptOut
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={10}
          />
        );
      case 11:
        return (
          <Step12SchoolCulturePlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={11}
          />
        );
      case 12:
        return (
          <Step13AfterSchoolPrograms
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={12}
          />
        );
      case 13:
        return (
          <Step14CellPhonePolicy
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={13}
          />
        );
      case 14:
        return (
          <Step15SchoolCounselingPlan
            stepData={currentStepData}
            updateStepData={dummyUpdate}
            currentStep={14}
          />
        );
      default:
        return null;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold mb-2">Error Loading Form</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .print-avoid-break {
            page-break-inside: avoid;
          }
          body {
            background: white;
          }
        }
      `}</style>

      {/* Header - Hidden when printing */}
      <header className="no-print bg-white shadow-lg border-b-2 border-sky-200 sticky top-0 z-10">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/form/${formId}`}>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Edit
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  {formData.schoolName} - Complete Form View
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  All steps in one view • Optimized for printing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-md"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-md disabled:cursor-not-allowed"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadDOCX}
                disabled={downloadingDOCX}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-md disabled:cursor-not-allowed"
              >
                {downloadingDOCX ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download DOCX
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Form Information Header */}
      <div className="max-w-xl mx-auto px-6 py-6 print-avoid-break">
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <School className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">School</p>
                <p className="text-lg font-semibold text-gray-800">{formData.schoolName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Principal</p>
                <p className="text-lg font-semibold text-gray-800">{formData.principalName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    formData.status === 'approved' ? 'bg-green-100 text-green-800' :
                    formData.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    formData.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.status || 'Draft'}
                  </span>
                  {formData.submittedAt && (
                    <span className="text-sm text-gray-600">
                      Submitted: {new Date(formData.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Steps */}
      <div className="max-w-8xl mx-auto px-6 pb-12">
        {FORM_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`bg-white rounded-lg shadow-md p-8 mb-8 print-avoid-break ${
              index > 0 ? 'print-break' : ''
            }`}
          >
            {/* Step Header */}
            <div className="border-b-2 border-blue-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {step.id}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{step.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Step {step.id} of {FORM_STEPS.length}
                    {stepData[step.key]?.completed && (
                      <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="prose max-w-none">
              {renderStep(step)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Hidden when printing */}
      <footer className="no-print bg-white border-t-2 border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">
          <p>Form ID: {formId}</p>
          <p className="mt-2">Generated on {new Date().toLocaleString()}</p>
        </div>
      </footer>
    </div>
  );
}

