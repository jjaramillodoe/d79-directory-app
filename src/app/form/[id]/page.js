'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Save, 
  Send,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Loader2,
  X,
  Target,
  BarChart3,
  Trophy,
  Award,
  BookOpen,
  Home,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

// Import form step components
import Step1TableOfContents from '../../../components/form-steps/Step1TableOfContents';
//import Step2PrincipalLetter from '../../../components/form-steps/Step2PrincipalLetter';
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
import DefaultFormStep from '../../../components/form-steps/DefaultFormStep';
import ScrollToTop from '../../../components/ScrollToTop';

export default function FormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id;
  const { data: session, status } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: '',
    status: 'draft'
  });
  const [collaborationInfo, setCollaborationInfo] = useState(null);
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [redirectTimeout, setRedirectTimeout] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [saveReminderTimeout, setSaveReminderTimeout] = useState(null);

  // Load form data when session and formId are available
  useEffect(() => {
    if (session && formId) {
      loadFormData();
    }
  }, [session, formId]);

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Check if user has permission (Level 1+ can view forms they're assigned to)
    if (session.user.level < 1) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Cleanup redirect countdown on unmount
  useEffect(() => {
    return () => {
      // Clear any remaining countdown intervals and timeouts
      if (redirecting) {
        setRedirecting(false);
        setRedirectCountdown(0);
        if (redirectTimeout) {
          clearTimeout(redirectTimeout);
        }
      }
      
      // Clear auto-save timeout
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
      }
      
      // Clear save reminder timeout
      if (saveReminderTimeout) {
        clearTimeout(saveReminderTimeout);
      }
    };
  }, [redirecting, redirectTimeout, saveReminderTimeout]);

  // Function to cancel redirect
  const cancelRedirect = () => {
    if (redirectTimeout) {
      clearTimeout(redirectTimeout);
      setRedirectTimeout(null);
    }
    setRedirecting(false);
    setRedirectCountdown(0);
  };

  const FORM_STEPS = [
    { id: 1, title: 'Table of Contents' },
    //{ id: 2, title: 'Principal Letter' },
    { id: 2, title: 'Child Abuse and Neglect Intervention' },
    { id: 3, title: 'Student to Student Sexual Harassment' },
    { id: 4, title: 'Respect For All Plan' },
    { id: 5, title: 'Suicide Prevention and Crisis Intervention' },
    { id: 6, title: 'School Attendance Plan' },
    { id: 7, title: 'Students in Temporary Housing Program' },
    { id: 8, title: 'Service In Schools Plan' },
    { id: 9, title: 'Planning Interviews' },
    { id: 10, title: 'Military Recruitment Opt-Out' },
    { id: 11, title: 'School Culture Plan' },
    { id: 12, title: 'After School Programs' },
    { id: 13, title: 'Cell Phone Policy' },
    { id: 14, title: 'School Counseling Plan' },
  ];

  // Enhanced save function with better error handling and data validation
  const saveCurrentStep = async () => {
    const currentStepData = getCurrentStepData();
    const hasData = Object.keys(currentStepData).length > 0;
    
    // Don't save if there's no data to save
    if (!hasData) {
      return { success: true, message: 'No data to save' };
    }
    
    const apiPayload = {
      action: 'save_step',
      step: currentStep,
      stepData: {
        completed: hasData,
        data: currentStepData
      },
      currentStep: currentStep
    };

    const response = await fetch(`/api/forms/${formId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Update local state to reflect the save
    const stepKey = getStepKey(currentStep);
    setStepData(prev => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        completed: hasData,
        data: currentStepData
      }
    }));

    // Update last saved timestamp
    setLastSaved(new Date());
    return result;
  };

  // Check if current step has unsaved changes
  const hasUnsavedChanges = () => {
    const currentStepData = getCurrentStepData();
    return Object.keys(currentStepData).length > 0;
  };

  // Enhanced navigation with unsaved changes warning
  const handleNext = async () => {
    if (currentStep < FORM_STEPS.length) {
      if (hasUnsavedChanges()) {
        // Auto-save current step before moving to next
        try {
          await saveCurrentStep();
          setCurrentStep(currentStep + 1);
        } catch (error) {
          console.error('Error auto-saving step:', error);
          const shouldContinue = confirm(
            '⚠️ Warning: Could not auto-save current step.\n\n' +
            'Your data may be lost if you continue.\n\n' +
            'Click OK to continue anyway, or Cancel to stay on this step and save manually.'
          );
          if (shouldContinue) {
            setCurrentStep(currentStep + 1);
          }
        }
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 1) {
      if (hasUnsavedChanges()) {
        // Auto-save current step before moving to previous
        try {
          await saveCurrentStep();
          setCurrentStep(currentStep - 1);
        } catch (error) {
          console.error('Error auto-saving step:', error);
          const shouldContinue = confirm(
            '⚠️ Warning: Could not auto-save current step.\n\n' +
            'Your data may be lost if you continue.\n\n' +
            'Click OK to continue anyway, or Cancel to stay on this step and save manually.'
          );
          if (shouldContinue) {
            setCurrentStep(currentStep - 1);
          }
        }
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  // Map step numbers to form data section names
  const getStepKey = (step) => {
    const stepMap = {
      1: 'tableOfContents',
      2: 'childAbuseIntervention',
      3: 'sexualHarassment',
      4: 'respectForAll',
      5: 'suicidePrevention',
      6: 'attendancePlan',
      7: 'temporaryHousing',
      8: 'serviceInSchools',
      9: 'planningInterviews',
      10: 'militaryRecruitment',
      11: 'schoolCulture',
      12: 'afterSchoolPrograms',
      13: 'cellPhonePolicy',
      14: 'counselingPlan'
    };
    return stepMap[step] || `step${step}`;
  };

  // Enhanced updateStepData with optimized auto-save capability
  const updateStepData = (stepKey, data) => {
    // stepKey can be either the field name (for backward compatibility) or the actual step key
    const actualStepKey = stepKey === 'tableOfContents' || stepKey === 'principalLetter' || 
                         stepKey === 'childAbuseIntervention' || stepKey === 'sexualHarassment' || 
                         stepKey === 'respectForAll' || stepKey === 'suicidePrevention' || 
                         stepKey === 'attendancePlan' || stepKey === 'temporaryHousing' || 
                         stepKey === 'serviceInSchools' || stepKey === 'planningInterviews' || 
                         stepKey === 'militaryRecruitment' || stepKey === 'schoolCulture' || 
                         stepKey === 'afterSchoolPrograms' || stepKey === 'cellPhonePolicy' || 
                         stepKey === 'counselingPlan' ? stepKey : getStepKey(currentStep);
    
    setStepData(prev => {
      const newStepData = {
        ...prev,
        [actualStepKey]: {
          ...prev[actualStepKey],
          data: data, // Use the entire data object passed from the component
          completed: Object.keys(data).length > 0,
          lastUpdated: new Date().toISOString()
        }
      };
      
      return newStepData;
    });

    // Clear any existing save reminder
    if (saveReminderTimeout) {
      clearTimeout(saveReminderTimeout);
      setSaveReminderTimeout(null);
    }

    // Show save reminder after 3 minutes of inactivity
    const reminderTimeout = setTimeout(() => {
      setShowSaveReminder(true);
    }, 360000); // 6 minutes
    setSaveReminderTimeout(reminderTimeout);

    // Debounced auto-save - only save after 5 seconds of inactivity
    // This prevents excessive API calls while still protecting user data
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
      const currentStepData = getCurrentStepData();
      if (Object.keys(currentStepData).length > 0) {
        autoSave();
      }
    }, 5000); // Save after 5 seconds of inactivity
  };

  const getCurrentStepData = () => {
    const stepKey = getStepKey(currentStep);
    const data = stepData[stepKey]?.data || {};
    
    // Ensure we always return the data, even if it's empty
    return data;
  };

  // Auto-save function that can be called periodically or on blur
  const autoSave = async () => {
    const currentStepData = getCurrentStepData();
    if (Object.keys(currentStepData).length > 0) {
      try {
        setAutoSaving(true);
        await saveCurrentStep();
        setLastSaved(new Date());
        // Auto-save completed successfully
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show alert for auto-save failures to avoid interrupting user
      } finally {
        setAutoSaving(false);
      }
    }
  };

  // Auto-save when user leaves a step (component unmounts or step changes)
  useEffect(() => {
    // Don't auto-save during step navigation - it's causing state issues
    // Auto-save will happen through the navigation functions instead
  }, [currentStep, stepData]);

  // Optimized periodic auto-save - every 2 minutes instead of 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStepData = getCurrentStepData();
      if (Object.keys(currentStepData).length > 0) {
        autoSave();
      }
    }, 120000); // Changed from 30 seconds to 2 minutes (120,000ms)

    return () => clearInterval(interval);
  }, [currentStep]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, stepData]);

  // Enhanced loadFormData with better error handling
  const loadFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.form) {
        setFormData({
          schoolName: data.form.schoolName || '',
          status: data.form.status || 'draft'
        });
        setCurrentStep(data.form.currentStep || 1);
        
        // Set collaboration info if available
        if (data.collaborationInfo) {
          setCollaborationInfo(data.collaborationInfo);
        }
        
        // Ensure stepData is properly initialized with all steps
        const loadedStepData = data.form.formData || {};
        const stepKeys = [
          'tableOfContents', 'childAbuseIntervention',
          'sexualHarassment', 'respectForAll', 'suicidePrevention',
          'attendancePlan', 'temporaryHousing', 'serviceInSchools',
          'planningInterviews', 'militaryRecruitment', 'schoolCulture',
          'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
        ];
        
        // Initialize missing steps with empty data structure and fix nested data
        const initializedStepData = {};
        stepKeys.forEach(key => {
          const stepInfo = loadedStepData[key];
          let stepData = {};
          
          // Fix nested data structure - extract the actual question data
          if (stepInfo?.data && typeof stepInfo.data === 'object') {
            // Check if data is nested (e.g., { childAbuseIntervention: { question1: "..." } })
            const nestedKey = Object.keys(stepInfo.data)[0];
            if (nestedKey === key && stepInfo.data[nestedKey]) {
              // Extract the nested data
              stepData = stepInfo.data[nestedKey];
            } else {
              // Data is already flat
              stepData = stepInfo.data;
            }
          } else if (stepInfo && !stepInfo.data) {
            // Handle case where step exists but has no data property (like counselingPlan)
            stepData = {};
          }
          
          initializedStepData[key] = {
            completed: stepInfo?.completed || false,
            data: stepData,
            startedAt: stepInfo?.startedAt || null,
            lastUpdated: stepInfo?.lastUpdated || null,
            timeSpent: stepInfo?.timeSpent || 0,
            revisionCount: stepInfo?.revisionCount || 0
          };
        });
        
        
        setStepData(initializedStepData);
      }
    } catch (error) {
      console.error('Error loading form:', error);
      // If form not found, redirect back to dashboard
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const renderFormStep = () => {
    const currentStepData = getCurrentStepData();
    
    switch (currentStep) {
      case 1:
        return (
          <Step1TableOfContents 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      //case 2:
        /*return (
          <Step2PrincipalLetter 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );*/
      case 2:
        return (
          <Step3ChildAbusePreventionPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 3:
        return (
          <Step4StudenttoStudentSexualHarassment 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 4:
        return (
          <Step5RespectForAllPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 5:
        return (
          <Step6SchoolCrisisInterventionPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 6:
        return (
          <Step7SchoolAttendancePlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 7:
        return (
          <Step8StudentsinTemporaryHousingProgramPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 8:
        return (
          <Step9ServiceInSchoolsPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 9:
        return (
          <Step10PlanningInterviews 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 10:
        return (
          <Step11MilitaryRecruitmentOptOut 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 11:
        return (
          <Step12SchoolCulturePlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 12:
        return (
          <Step13AfterSchoolPrograms 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 13:
        return (
          <Step14CellPhonePolicy 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      case 14:
        return (
          <Step15SchoolCounselingPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData} 
          />
        );
      default:
        return (
          <DefaultFormStep 
            currentStep={currentStep} 
            stepTitle={FORM_STEPS[currentStep - 1]?.title} 
          />
        );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveCurrentStep();
      
      if (result.success) {
        const completionStatus = getCompletionStatus();
        const saveMessage = `✅ Step ${currentStep} saved successfully!\n\n📊 Progress: ${completionStatus.completed}/${completionStatus.total} steps completed (${completionStatus.percentage}%)\n\n🎯 Redirecting to dashboard in 3 seconds...`;
        
        alert(saveMessage);
        
        // Set redirecting state and auto-redirect to dashboard after 3 seconds
        setRedirecting(true);
        setRedirectCountdown(3);
        
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Set a separate timeout for the actual redirect
        const timeoutRef = setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        setRedirectTimeout(timeoutRef);
      } else {
        throw new Error(result.message || 'Save failed');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert(`❌ Failed to save form: ${error.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // First save the current step
      await saveCurrentStep();

      // Validate form data before submission
      const validation = validateFormData();
      if (!validation.isValid) {
        const errorMessage = `Please complete the following steps before submission:\n\n${validation.errors.join('\n')}`;
        alert(errorMessage);
        setSaving(false);
        return;
      }

      // Check if all steps are completed
      const allStepsCompleted = checkAllStepsCompleted();
      if (!allStepsCompleted) {
        const confirmSubmit = confirm(
          'Some steps are not marked as completed. Are you sure you want to submit the form? You can always edit it later.'
        );
        if (!confirmSubmit) {
          setSaving(false);
          return;
        }
      }

      // Final confirmation before submission
      const finalConfirm = confirm(
        `🚀 Ready to submit your School Plan Form?\n\n` +
        `📊 Progress: ${getCompletionStatus().completed}/${getCompletionStatus().total} steps completed\n` +
        `📝 School: ${formData.schoolName}\n` +
        `👤 Principal: ${session.user.name}\n\n` +
        `This will submit your form for administrative review. You can still edit it later if needed.\n\n` +
        `Click OK to submit, or Cancel to continue editing.`
      );

      if (!finalConfirm) {
        setSaving(false);
        return;
      }

             // Get completion status for submission
       const completionStatus = getCompletionStatus();

      // Submit the complete form with all step data
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          currentStep: currentStep,
          formData: stepData, // Send all collected form data
          allStepsCompleted: allStepsCompleted
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const successMessage = 
          `🎉 CONGRATULATIONS! 🎉\n\n` +
          `Your School Plan Form has been successfully submitted for review!\n\n` +
          `📊 Submission Details:\n` +
          `• School: ${formData.schoolName}\n` +
          `• Principal: ${session.user.name}\n` +
          `• Steps Completed: ${getCompletionStatus().completed}/${getCompletionStatus().total}\n` +
          `• Submission Date: ${new Date().toLocaleDateString()}\n\n` +
          `📝 Next Steps:\n` +
          `• Your form is now under administrative review\n` +
          `• You will receive notifications about the review status\n` +
          `• You can still edit the form if needed\n\n` +
          `🎯 Redirecting to dashboard in 5 seconds...\n\n` +
          `Thank you for completing your School Plan Form!`;
        
        alert(successMessage);
        
        // Set redirecting state and auto-redirect to dashboard after 5 seconds
        setRedirecting(true);
        setRedirectCountdown(5);
        
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Set a separate timeout for the actual redirect
        const timeoutRef = setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
        setRedirectTimeout(timeoutRef);
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Failed to submit form: ${error.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Check if all steps are completed
  const checkAllStepsCompleted = () => {
    const stepKeys = [
      'tableOfContents', 'principalLetter', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ];

    return stepKeys.every(stepKey => stepData[stepKey]?.completed === true);
  };

  // Validate form data before submission
  const validateFormData = () => {
    const stepKeys = [
      'tableOfContents', 'principalLetter', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ];

    const validationErrors = [];
    
    stepKeys.forEach((stepKey, index) => {
      const stepInfo = stepData[stepKey];
      if (!stepInfo?.data || Object.keys(stepInfo.data).length === 0) {
        validationErrors.push(`Step ${index + 1}: ${FORM_STEPS[index]?.title || stepKey} - No data entered`);
      }
    });

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  };

  // Get completion status for display
  const getCompletionStatus = () => {
    const stepKeys = [
      'tableOfContents', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ];

    const completedSteps = stepKeys.filter(stepKey => stepData[stepKey]?.completed === true);
    const totalSteps = stepKeys.length;
    
    return {
      completed: completedSteps.length,
      total: totalSteps,
      percentage: Math.round((completedSteps.length / totalSteps) * 100)
    };
  };

  // Helper function to get step number from step key
  const getStepNumberFromKey = (stepKey) => {
    const stepMap = {
      'tableOfContents': 1,
      'childAbuseIntervention': 2,
      'sexualHarassment': 3,
      'respectForAll': 4,
      'suicidePrevention': 5,
      'attendancePlan': 6,
      'temporaryHousing': 7,
      'serviceInSchools': 8,
      'planningInterviews': 9,
      'militaryRecruitment': 10,
      'schoolCulture': 11,
      'afterSchoolPrograms': 12,
      'cellPhonePolicy': 13,
      'counselingPlan': 14
    };
    return stepMap[stepKey] || 0;
  };

  // Don't render until session and form data are loaded
  if (status === 'loading' || !session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-sky-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-6">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">
                  School Plan Form - {formData.schoolName}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <ClipboardList className="w-4 h-4" />
                  <span>Form ID: {formId} | Step {currentStep} of {FORM_STEPS.length}</span>
                </div>
                
                {/* Collaboration Banner */}
                {collaborationInfo && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-sm bg-blue-100 text-blue-800 border-blue-200">
                    <span>🔗 Shared Form</span>
                    <span className="font-semibold">•</span>
                    <span>{collaborationInfo.permissions} access</span>
                    {collaborationInfo.assignedAt && (
                      <>
                        <span className="font-semibold">•</span>
                        <span>Assigned {new Date(collaborationInfo.assignedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Quick Completion Status */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-sm ${
                  getCompletionStatus().completed === getCompletionStatus().total 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                    : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200'
                }`}>
                  {getCompletionStatus().completed === getCompletionStatus().total ? (
                    <Trophy className="w-4 h-4 text-green-600" />
                  ) : (
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="font-semibold">
                    {getCompletionStatus().completed}/{getCompletionStatus().total} Steps
                  </span>
                  {getCompletionStatus().completed < getCompletionStatus().total && (
                    <span className="text-red-600 text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {getCompletionStatus().total - getCompletionStatus().completed} Missing
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:from-blue-600 hover:to-sky-700 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b-2 border-sky-200 py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-700">Form Progress</span>
          </div>
          
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 h-3 rounded-full overflow-hidden shadow-inner border border-gray-200">
            <div 
              className="bg-gradient-to-r from-blue-500 to-sky-600 h-full transition-all duration-500 ease-out rounded-full shadow-sm"
              style={{ width: `${(currentStep / FORM_STEPS.length) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 sm:mb-0">
              <Target className="w-4 h-4 text-blue-600" />
              <span>Progress: {currentStep} of {FORM_STEPS.length} steps completed</span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Auto-save indicator */}
              {autoSaving && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-lg text-xs shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span className="text-amber-800 font-medium">Auto-saving...</span>
                </div>
              )}
              
              {/* Save reminder indicator */}
              {showSaveReminder && !autoSaving && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 rounded-lg text-xs shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-red-800 font-medium">Consider saving your work</span>
                  <button
                    onClick={() => setShowSaveReminder(false)}
                    className="ml-2 p-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 transition-all duration-200 hover:scale-110"
                    title="Dismiss reminder"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {/* Last saved indicator */}
              {lastSaved && !autoSaving && !showSaveReminder && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-lg text-xs shadow-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-lg text-xs shadow-sm">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-semibold">
                  {getCompletionStatus().completed}/{getCompletionStatus().total} steps completed ({getCompletionStatus().percentage}%)
                </span>
              </div>
            </div>
          </div>
          
          {/* Redirecting Indicator */}
          {redirecting && (
            <div className="flex justify-center items-center gap-3 mt-3 p-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-xl shadow-lg">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Redirecting to Dashboard in {redirectCountdown} seconds...
              </span>
              <button
                onClick={cancelRedirect}
                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <X className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {FORM_STEPS[currentStep - 1]?.title}
              </h2>
              <p className="text-gray-600 text-sm">
                Step {currentStep} of {FORM_STEPS.length} • {getCompletionStatus().completed}/{getCompletionStatus().total} completed
              </p>
            </div>
          </div>

          {/* Dynamic Form Content */}
          {renderFormStep()}

           {/* Enhanced Form Completion Summary */}
           {currentStep === FORM_STEPS.length && (
             <div className="bg-white border-2 border-blue-300 rounded-xl p-6 mb-8 shadow-lg">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Form Completion Summary
                  </h3>
                  <p className="text-gray-600">
                    Review your progress and complete any missing steps before submission
                  </p>
                </div>
                
                {/* Progress Overview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-gray-700">
                        Overall Progress
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">
                        {getCompletionStatus().completed}/{getCompletionStatus().total}
                      </div>
                      <div className="text-gray-600 font-medium">
                        Steps Completed
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="bg-gray-200 h-3 rounded-full overflow-hidden mb-3">
                    <div className="bg-green-500 h-full transition-all duration-1000 ease-in-out rounded-full"
                      style={{ width: `${getCompletionStatus().percentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium">
                        Completed
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {getCompletionStatus().percentage}%
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                      <span className="text-gray-600 font-medium">
                        Remaining
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Steps Status - Simple Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {FORM_STEPS.map((step, index) => {
                    const stepKey = getStepKey(step.id);
                    const stepInfo = stepData[stepKey];
                    // Use the completed field from stepData instead of recalculating
                    const isCompleted = stepInfo?.completed === true;
                    
                    return (
                      <div key={stepKey} className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                        isCompleted 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-red-300 bg-red-50'
                      }`}>
                        {/* Status Badge */}
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium text-white mb-3 ${
                          isCompleted ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {isCompleted ? '✓ Complete' : '⚠️ Pending'}
                        </div>
                        
                        {/* Step Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                            isCompleted ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <X className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 mb-1">
                              Step {step.id}
                            </div>
                            <div className="text-sm text-gray-600">
                              {step.title}
                            </div>
                          </div>
                        </div>
                        
                        {/* Step Details */}
                        <div className={`rounded p-2 mb-3 border ${
                          isCompleted 
                            ? 'bg-green-100 border-green-200' 
                            : 'bg-red-100 border-red-200'
                        }`}>
                          <div className="text-sm">
                            <span className="font-medium">Status: </span>
                            <span className={isCompleted ? 'text-green-700' : 'text-red-700'}>
                              {isCompleted ? '✓ All questions answered' : '⚠️ No data entered'}
                            </span>
                          </div>
                          
                          {isCompleted && (
                            <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>Last updated: {stepInfo?.lastUpdated ? new Date(stepInfo.lastUpdated).toLocaleDateString() : 'Recently'}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        {!isCompleted && (
                          <button
                            onClick={() => setCurrentStep(step.id)}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                            title={`Go to Step ${step.id} to complete it`}
                          >
                            🎯 Go to Step {step.id}
                          </button>
                        )}
                        
                        {isCompleted && (
                          <div className="text-center p-2 bg-green-100 rounded border border-green-200">
                            <span className="text-sm font-medium text-green-700">
                              🎉 Step Completed Successfully!
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Missing Steps Warning */}
                {getCompletionStatus().completed < getCompletionStatus().total && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-red-700 mb-1">
                          Missing Steps Detected
                        </div>
                        <div className="text-red-600 font-medium">
                          {getCompletionStatus().total - getCompletionStatus().completed} step(s) still need completion
                        </div>
                      </div>
                    </div>
                    <p className="text-red-600 px-3 py-2 bg-white rounded border border-red-200">
                      <strong>Action Required:</strong> Please complete all missing steps before submitting your form. 
                      Use the "Go to Step" buttons above to navigate to and complete the incomplete sections. 
                      This ensures your School Plan Form is comprehensive and ready for administrative review.
                    </p>
                  </div>
                )}

                {/* Submission Instructions */}
                <div className={`rounded-lg p-4 border-2 ${
                  getCompletionStatus().completed === getCompletionStatus().total 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      getCompletionStatus().completed === getCompletionStatus().total 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    }`}>
                      {getCompletionStatus().completed === getCompletionStatus().total ? (
                        <Trophy className="w-5 h-5" />
                      ) : (
                        <ClipboardList className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xl font-bold mb-1 ${
                        getCompletionStatus().completed === getCompletionStatus().total ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {getCompletionStatus().completed === getCompletionStatus().total 
                          ? 'Ready to Submit!' 
                          : 'Complete Missing Steps First'
                        }
                      </div>
                      <div className={`font-medium ${
                        getCompletionStatus().completed === getCompletionStatus().total ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {getCompletionStatus().completed === getCompletionStatus().total 
                          ? 'All steps are completed and ready for review'
                          : `${getCompletionStatus().total - getCompletionStatus().completed} steps remaining`
                        }
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <p className={`font-medium ${
                      getCompletionStatus().completed === getCompletionStatus().total ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {getCompletionStatus().completed === getCompletionStatus().total 
                        ? 'Your School Plan Form is complete and ready for administrative review! Click the "Submit for Review" button below to send your completed form for evaluation. You can still edit the form later if needed.'
                        : 'Please complete all missing steps before submitting. Use the "Go to Step" buttons above to navigate to incomplete sections. Once all steps are completed, you\'ll be able to submit your form for review.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

           {/* Navigation Buttons */}
          <div className="flex justify-between items-center border-t border-gray-200 pt-6">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-2 ${
                currentStep === 1 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex gap-3">
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges() && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-lg text-base text-amber-800 shadow-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Unsaved changes</span>
                </div>
              )}
              
              {/* Manual Save Button - Always visible when there are changes */}
              {hasUnsavedChanges() && (
                <button
                  onClick={handleSave}
                  disabled={saving || redirecting}
                  className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                    saving || redirecting 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-500 to-sky-600 text-white hover:from-blue-600 hover:to-sky-700 cursor-pointer'
                  }`}
                  title="Save your current work"
                >
                  <Save className="w-4 h-4" />
                  {redirecting ? 'Redirecting...' : saving ? 'Saving...' : 'Save Now'}
                </button>
              )}
              
              <button
                onClick={handleSave}
                disabled={saving || redirecting}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                  saving || redirecting 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 cursor-pointer'
                }`}
              >
                <Save className="w-4 h-4" />
                {redirecting ? 'Redirecting...' : saving ? 'Saving...' : 'Save Draft'}
              </button>

              {currentStep === FORM_STEPS.length ? (
                <button
                  onClick={handleSubmit}
                  disabled={saving || redirecting}
                  className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                    saving || redirecting 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 cursor-pointer'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {redirecting ? 'Redirecting...' : saving ? 'Submitting...' : 'Submit for Review'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-600 text-white rounded-lg text-base font-medium cursor-pointer transition-all duration-200 hover:from-blue-600 hover:to-sky-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}