'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';

// Import form step components
import Step1TableOfContents from '../../../components/form-steps/Step1TableOfContents';
import GenericFormStep from '../../../components/form-steps/GenericFormStep';
import DefaultFormStep from '../../../components/form-steps/DefaultFormStep';
import FormWorkspace from '../../../components/form-steps/FormWorkspace';
import FormStepMeta from '../../../components/form-steps/FormStepMeta';
import FormSubmitSummary from '../../../components/form-steps/FormSubmitSummary';
import DuplicateFormModal from '../../../components/admin/DuplicateFormModal';
import FormAttestModal from '../../../components/form-steps/FormAttestModal';
import { isTableAnswered } from '../../../lib/tableAnswer';
import { visibleQuestions, isGateQuestion, normalizeYesNo } from '../../../lib/questionBankUtils';
import FormShareModal from '../../../components/form-steps/FormShareModal';
import FormCommentModal from '../../../components/form-steps/FormCommentModal';
import FormConfirmModal from '../../../components/form-steps/FormConfirmModal';
import ScrollToTop from '../../../components/ScrollToTop';
import useQuestionBank from '../../../hooks/useQuestionBank';
import useAppToast from '../../../hooks/useAppToast';
import useFormData from '../../../hooks/useFormData';
import useFormAutoSave from '../../../hooks/useFormAutoSave';
import useFormCollaboration from '../../../hooks/useFormCollaboration';
import { Spinner, Column, Row, Text, Button } from '@once-ui-system/core';
import * as logger from '../../../lib/logger';

function FormPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id;
  const { data: session, status } = useSession();
  const toast = useAppToast();

  const [currentStep, setCurrentStep] = useState(1);
  const currentStepRef = useRef(1);
  const bankStepKeysRef = useRef([]);
  const lockDegradedNotifiedRef = useRef(false);
  const redirectTimeoutRef = useRef(null);
  const redirectCountdownRef = useRef(null);
  const saveReminderTimeoutRef = useRef(null);

  const notifyLockDegraded = useCallback(() => {
    if (lockDegradedNotifiedRef.current) return;
    lockDegradedNotifiedRef.current = true;
    toast.warning(
      'Your work is saving normally, but we cannot currently tell you if a colleague is editing the same section. Check with your team before making large changes.'
    );
  }, [toast]);

  const form = useFormData({
    formId,
    session,
    router,
    toast,
    bankStepKeysRef,
    currentStepRef,
    setCurrentStep,
  });
  const {
    formData,
    collaborationInfo,
    userPermissions,
    stepData,
    setStepData,
    loading,
    needsUpdate,
    setNeedsUpdate,
    formLocked,
    yearArchived,
    allowEditsWhenArchived,
    formDeadlines,
    attestation,
    setAttestation,
    duplicatedFrom,
    comments,
    setComments,
    loadFormData,
  } = form;

  const isDraftForm = (formData.status || 'draft') === 'draft';
  const isSuperAdminActor =
    Number(session?.user?.level) === 5 || Number(session?.actorLevel) === 5;
  const previewDraftBank = isSuperAdminActor && isDraftForm;
  const { questionBank, loading: questionBankLoading } = useQuestionBank({
    schoolYear: formData.schoolYear,
    version: isDraftForm ? undefined : formData.questionBankVersion,
    draft: previewDraftBank,
    preferPublished: isDraftForm && !previewDraftBank,
  });

  const FORM_STEPS = (questionBank.steps || []).map((step, index) => ({
    id: index + 1,
    title: step.title,
    key: step.key,
  }));
  const bankStepKeys = FORM_STEPS.map((step) => step.key);
  const getStepKey = (step) => FORM_STEPS[step - 1]?.key || null;
  const getStepNumberFromKey = (stepKey) => {
    const index = bankStepKeys.indexOf(stepKey);
    return index >= 0 ? index + 1 : 0;
  };

  const collaboration = useFormCollaboration({
    formId,
    session,
    currentStep,
    getStepKey,
  });
  const { activeLocks, activeEditors, setCurrentLockedStep } = collaboration;

  const autosave = useFormAutoSave({
    formId,
    currentStep,
    getStepKey,
    getStepNumberFromKey,
    bankStepKeys,
    stepData,
    setStepData,
    userPermissions,
    formLocked,
    notifyLockDegraded,
    setCurrentLockedStep,
    saveReminderTimeoutRef,
  });
  const {
    autoSaving,
    lastSaved,
    setLastSaved,
    showSaveReminder,
    setShowSaveReminder,
    saveError,
    setSaveError,
    saveCurrentStep,
    updateStepData,
    getCurrentStepData,
  } = autosave;

  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState('under_review');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(null);
  const [unshareEmail, setUnshareEmail] = useState('');
  const [attestName, setAttestName] = useState('');
  const [shareEmails, setShareEmails] = useState('');
  const [sharePermissions, setSharePermissions] = useState('view');
  const [sharedWithEmails, setSharedWithEmails] = useState([]);
  const [sharing, setSharing] = useState(false);

  const isPrintView = searchParams.get('print') === 'true';

  useEffect(() => {
    if (isPrintView) {
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `;
      document.head.appendChild(style);
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isPrintView]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    bankStepKeysRef.current = bankStepKeys;
  }, [bankStepKeys]);

  useEffect(() => {
    if (session?.user && formId && formId !== 'undefined' && formId !== 'null') {
      loadFormData();
    } else if (session && (!formId || formId === 'undefined' || formId === 'null')) {
      logger.error('Invalid form ID:', formId);
      toast.error('Invalid form ID. Redirecting to dashboard…');
      setTimeout(() => router.push('/dashboard'), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, formId]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.level < 1) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    return () => {
      clearInterval(redirectCountdownRef.current);
      clearTimeout(redirectTimeoutRef.current);
      clearTimeout(saveReminderTimeoutRef.current);
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
      }
    };
  }, []);

  const cancelRedirect = () => {
    clearTimeout(redirectTimeoutRef.current);
    clearInterval(redirectCountdownRef.current);
    redirectTimeoutRef.current = null;
    redirectCountdownRef.current = null;
    setRedirecting(false);
    setRedirectCountdown(0);
  };

  const persistCurrentStep = (stepNumber) => {
    if (!formId || !stepNumber) return;
    fetch(`/api/forms/${formId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStep: stepNumber }),
    }).catch(() => {});
  };

  const goToStep = (stepNumber) => {
    const next = Number(stepNumber);
    if (!next || next === currentStepRef.current) return;
    currentStepRef.current = next;
    setCurrentStep(next);
    persistCurrentStep(next);
    const pane = document.querySelector('[data-form-step-scroll]');
    if (pane) pane.scrollTop = 0;
  };

  const handleNext = async () => {
    if (currentStep < FORM_STEPS.length) {
      // Clear any pending debounced auto-saves
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = null;
      }
      
      // Always try to save current step before moving to next
      // This ensures any pending data is persisted
      const stepKey = getStepKey(currentStep);
      const currentStepData = stepData[stepKey]?.data || {};
      
      if (Object.keys(currentStepData).length > 0) {
        try {
          // Use saveCurrentStep which has retry logic built in
          await saveCurrentStep(3); // 3 retries for navigation saves
        } catch (error) {
          logger.error('Error auto-saving step:', error);
          
          // Check if it's a connection/database error
          const isConnectionError = error.message?.toLowerCase().includes('connection') ||
                                   error.message?.toLowerCase().includes('database') ||
                                   error.message?.toLowerCase().includes('timeout') ||
                                   error.message?.toLowerCase().includes('network');
          
          const warningMessage = isConnectionError
            ? '⚠️ Connection Issue: Could not save due to a database connection problem.\n\n' +
              'Your changes are saved locally but may not be on the server yet.\n\n' +
              'Click OK to continue (your work is safe), or Cancel to stay and retry saving.'
            : '⚠️ Warning: Could not auto-save current step.\n\n' +
              'Your data may be lost if you continue.\n\n' +
              'Click OK to continue anyway, or Cancel to stay on this step and save manually.';
          
          const shouldContinue = confirm(warningMessage);
          if (!shouldContinue) {
            return; // Don't navigate if user cancels
          }
        }
      }
      
      goToStep(currentStep + 1);
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 1) {
      // Clear any pending debounced auto-saves
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = null;
      }
      
      // Always try to save current step before moving to previous
      const stepKey = getStepKey(currentStep);
      const currentStepData = stepData[stepKey]?.data || {};
      
      if (Object.keys(currentStepData).length > 0) {
        try {
          // Use saveCurrentStep which has retry logic built in
          await saveCurrentStep(3); // 3 retries for navigation saves
        } catch (error) {
          logger.error('Error auto-saving step:', error);
          
          // Check if it's a connection/database error
          const isConnectionError = error.message?.toLowerCase().includes('connection') ||
                                   error.message?.toLowerCase().includes('database') ||
                                   error.message?.toLowerCase().includes('timeout') ||
                                   error.message?.toLowerCase().includes('network');
          
          const warningMessage = isConnectionError
            ? '⚠️ Connection Issue: Could not save due to a database connection problem.\n\n' +
              'Your changes are saved locally but may not be on the server yet.\n\n' +
              'Click OK to continue (your work is safe), or Cancel to stay and retry saving.'
            : '⚠️ Warning: Could not auto-save current step.\n\n' +
              'Your data may be lost if you continue.\n\n' +
              'Click OK to continue anyway, or Cancel to stay on this step and save manually.';
          
          const shouldContinue = confirm(warningMessage);
          if (!shouldContinue) {
            return; // Don't navigate if user cancels
          }
        }
      }
      
      goToStep(currentStep - 1);
    }
  };

  // Function to navigate to a specific step
  const navigateToStep = async (stepNumber) => {
    if (stepNumber === currentStep) return; // Already on this step
    
    // Clear any pending debounced auto-saves to prevent race conditions
    if (window.autoSaveTimeout) {
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = null;
    }
    
    // Force immediate save of current step before navigating
    // This ensures all data is saved to the database, not just in local state
    const stepKey = getStepKey(currentStep);
    const currentStepData = stepData[stepKey]?.data || {};
    
    if (Object.keys(currentStepData).length > 0) {
      try {
        // Use saveCurrentStep which has retry logic built in
        await saveCurrentStep(3); // 3 retries for navigation saves
        logger.debug(`✅ Step ${currentStep} saved before navigating to step ${stepNumber}`);
      } catch (error) {
        logger.error('Error saving before navigation:', error);
        
        // Check if it's a connection/database error
        const isConnectionError = error.message?.toLowerCase().includes('connection') ||
                                 error.message?.toLowerCase().includes('database') ||
                                 error.message?.toLowerCase().includes('timeout') ||
                                 error.message?.toLowerCase().includes('network');
        
        // Show appropriate warning message
        const warningMessage = isConnectionError
          ? '⚠️ Connection Issue: Could not save current step due to a database connection problem.\n\n' +
            'Your changes are saved locally but may not be on the server yet.\n\n' +
            'Click OK to continue (your work is safe), or Cancel to stay and retry saving.'
          : '⚠️ Warning: Could not save current step before switching.\n\n' +
            'Your recent changes may be lost.\n\n' +
            'Click OK to continue anyway, or Cancel to stay on this step.';
        
        const shouldContinue = confirm(warningMessage);
        if (!shouldContinue) {
          return; // Don't navigate if user cancels
        }
      }
    }
    
    goToStep(stepNumber);
  };

  const renderFormStep = () => {
    const currentStepData = getCurrentStepData();
    const stepKey = getStepKey(currentStep);
    const stepConfig = questionBank.steps.find((step) => step.key === stepKey);
    const stepQuestions = stepConfig?.questions || [];
    const stepTitle = `Section ${currentStep}: ${FORM_STEPS[currentStep - 1]?.title || stepConfig?.title || ''}`;

    if (currentStep === 1) {
      return (
        <Step1TableOfContents 
          stepData={currentStepData} 
          updateStepData={updateStepData}
          navigateToStep={navigateToStep}
          allStepData={stepData}
          currentStep={currentStep}
          questions={stepQuestions}
          intro={stepConfig?.intro || ''}
          formSteps={FORM_STEPS}
          readOnly={formLocked || userPermissions === 'view'}
        />
      );
    }

    if (stepConfig) {
      return (
        <GenericFormStep
          stepKey={stepKey}
          stepTitle={stepTitle}
          intro={stepConfig?.intro || ''}
          questions={stepQuestions}
          stepData={currentStepData}
          updateStepData={updateStepData}
          currentStep={currentStep}
          readOnly={formLocked || userPermissions === 'view'}
          needsUpdate={needsUpdate.filter((item) => item.stepKey === stepKey || !item.stepKey)}
          onReviewQuestion={async (questionId) => {
            const response = await fetch(`/api/forms/${formId}/review-flag`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId }),
            });
            if (response.ok) {
              const payload = await response.json();
              setNeedsUpdate(payload.needsUpdate || []);
            }
          }}
        />
      );
    }

    return (
      <DefaultFormStep 
        currentStep={currentStep} 
        stepTitle={FORM_STEPS[currentStep - 1]?.title} 
      />
    );
  };

  // Save Now - saves and redirects to dashboard
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveCurrentStep();
      
      if (result.success) {
        const completionStatus = getCompletionStatus();
        toast.success(`Step ${currentStep} saved. ${completionStatus.completed}/${completionStatus.total} steps complete. Redirecting…`);
        
        // Set redirecting state and auto-redirect to dashboard after 3 seconds
        setRedirecting(true);
        setRedirectCountdown(3);
        
        redirectCountdownRef.current = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(redirectCountdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Set a separate timeout for the actual redirect
        redirectTimeoutRef.current = setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        throw new Error(result.message || 'Save failed');
      }
    } catch (error) {
      logger.error('Error saving form:', error);
      toast.error(`Failed to save form: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Save Draft - saves and stays on the form
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = null;
      }

      const result = await saveCurrentStep(3);

      if (result.success) {
        setLastSaved(new Date());
        setShowSaveReminder(false);
        const completionStatus = getCompletionStatus();
        toast.success(`Draft saved. The plan was not submitted. ${completionStatus.completed}/${completionStatus.total} sections complete.`);
      } else {
        throw new Error(result.message || 'Save failed');
      }
    } catch (error) {
      logger.error('Error saving draft:', error);
      toast.error(`Could not save draft: ${error.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveCurrentStep();
      await loadFormData();
      const validation = validateFormData();
      const completion = getCompletionStatus();
      const warnings = [...(validation.errors || [])];
      if (completion.completed < completion.total) {
        warnings.push(
          `${completion.total - completion.completed} of ${completion.total} sections are not fully complete.`
        );
      }
      setSubmitConfirm({ warnings, completion });
    } catch (error) {
      logger.error('Error preparing submission:', error);
      toast.error(`Could not prepare submission: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const performSubmit = async () => {
    setSaving(true);
    try {
      const allStepsCompleted = checkAllStepsCompleted();
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          currentStep,
          formData: stepData,
          allStepsCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Submitted ${formData.schoolName} for review. Redirecting…`);
        setRedirecting(true);
        setRedirectCountdown(5);
        redirectCountdownRef.current = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(redirectCountdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        redirectTimeoutRef.current = setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      logger.error('Error submitting form:', error);
      toast.error(`Failed to submit form: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const continueAfterSubmitConfirm = () => {
    setSubmitConfirm(null);
    if (duplicatedFrom && !attestation?.confirmed) {
      setAttestName(session?.user?.name || '');
      setShowAttestModal(true);
      return;
    }
    performSubmit();
  };

  // Check if all steps are completed
  const checkAllStepsCompleted = () => {
    // Only check steps that actually exist (principalLetter was removed)
    const stepKeys = bankStepKeys;

    return stepKeys.every(stepKey => stepData[stepKey]?.completed === true);
  };

  // Validate form data before submission
  const validateFormData = () => {
    // Only check steps that actually exist (principalLetter was removed)
    const stepKeys = bankStepKeys;

    const validationErrors = [];
    
    // Map stepKeys to FORM_STEPS (which doesn't include principalLetter)
    stepKeys.forEach((stepKey, index) => {
      const stepInfo = stepData[stepKey];
      
      // Check if step has data - be more lenient in checking
      // Data might be nested or in different formats
      let hasData = false;
      
      if (stepInfo?.data) {
        // Check if data object has any non-empty values
        const dataObj = stepInfo.data;
        hasData = Object.keys(dataObj).length > 0 && 
                  Object.values(dataObj).some(value => {
                    // Check if value is not empty (not empty string, not false, not null, not undefined)
                    if (typeof value === 'string') return value.trim().length > 0;
                    if (typeof value === 'boolean') return value === true;
                    if (value === null || value === undefined) return false;
                    if (typeof value === 'object') return Object.keys(value).length > 0;
                    return true;
                  });
      }
      
      // Also check if step is marked as completed
      const isCompleted = stepInfo?.completed === true;
      
      // Only report error if step has no data AND is not marked as completed
      if (!hasData && !isCompleted) {
        // Use FORM_STEPS array which matches the actual steps (no principalLetter)
        const stepNumber = index + 1; // Since we removed principalLetter, indices match
        const stepTitle = FORM_STEPS[index]?.title || stepKey;
        validationErrors.push(`Step ${stepNumber}: ${stepTitle} - No data entered`);
      }
    });

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  };

  // Check if a question has been answered
  const isQuestionAnswered = (question, stepData) => {
    if (isGateQuestion(question) && (question.type === 'checkbox' || question.type === 'yesno')) {
      return true;
    }

    if (!stepData) {
      return false;
    }

    const value = stepData[question.id];

    if (question.type === 'checkbox') {
      return value === true;
    }

    if (question.type === 'yesno') {
      return normalizeYesNo(value) === 'yes' || normalizeYesNo(value) === 'no';
    }

    if (value === undefined || value === null || value === '') {
      return false;
    }
    
    // For text/textarea, check if it's not empty
    if (question.type === 'text' || question.type === 'textarea') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (question.type === 'table') {
      return isTableAnswered(value);
    }
    
    // For other types, check if value exists
    return value !== null && value !== undefined && value !== '';
  };

  // Check if all required questions in a step are answered
  const areAllRequiredQuestionsAnswered = (stepKey) => {
    const step = questionBank.steps.find(s => s.key === stepKey);
    if (!step || !step.questions) {
      return false;
    }
    
    const stepInfo = stepData[stepKey];
    if (!stepInfo || !stepInfo.data) {
      return false;
    }
    
    const stepQuestions = visibleQuestions(step.questions, stepInfo.data);
    const requiredQuestions = stepQuestions.filter(q => q.required === true && q.active !== false);
    
    // If no required questions, check if step has any data
    if (requiredQuestions.length === 0) {
      return Object.keys(stepInfo.data).length > 0;
    }
    
    // Check if all required questions are answered
    return requiredQuestions.every(question => isQuestionAnswered(question, stepInfo.data));
  };

  // Get detailed completion status for a step
  const getStepCompletionDetails = (stepKey) => {
    const step = questionBank.steps.find(s => s.key === stepKey);
    if (!step || !step.questions) {
      return {
        totalQuestions: 0,
        requiredQuestions: 0,
        answeredQuestions: 0,
        answeredRequired: 0,
        isComplete: false,
        missingRequired: []
      };
    }
    
    const stepInfo = stepData[stepKey];
    const stepDataObj = stepInfo?.data || {};
    
    const allQuestions = visibleQuestions(step.questions, stepDataObj);
    const requiredQuestions = allQuestions.filter(q => q.required === true && q.active !== false);
    const optionalQuestions = allQuestions.filter(q => q.required !== true || q.active === false);
    
    const answeredRequired = requiredQuestions.filter(q => isQuestionAnswered(q, stepDataObj));
    const answeredOptional = optionalQuestions.filter(q => isQuestionAnswered(q, stepDataObj));
    const missingRequired = requiredQuestions.filter(q => !isQuestionAnswered(q, stepDataObj));
    
    // Determine if step is complete:
    // - If there are required questions: all must be answered
    // - If there are NO required questions: step is complete if it has any data OR if it's been marked as completed
    let isComplete = false;
    if (requiredQuestions.length === 0) {
      // No required questions - consider complete if there's any data OR if step is marked as completed
      const hasAnyData = Object.keys(stepDataObj).length > 0;
      const isMarkedCompleted = stepInfo?.completed === true;
      isComplete = hasAnyData || isMarkedCompleted;
    } else {
      // Has required questions - all must be answered
      isComplete = missingRequired.length === 0 && answeredRequired.length === requiredQuestions.length;
    }
    
    return {
      totalQuestions: allQuestions.length,
      requiredQuestions: requiredQuestions.length,
      optionalQuestions: optionalQuestions.length,
      answeredQuestions: answeredRequired.length + answeredOptional.length,
      answeredRequired: answeredRequired.length,
      answeredOptional: answeredOptional.length,
      isComplete: isComplete,
      missingRequired: missingRequired.map(q => ({
        id: q.id,
        number: q.question_number,
        title: q.title
      }))
    };
  };

  // Get completion status for display (weighted by required questions)
  const getCompletionStatus = () => {
    const stepKeys = bankStepKeys;

    // Calculate completion based on required questions answered, not just step completion flag
    let totalRequiredQuestions = 0;
    let answeredRequiredQuestions = 0;
    let fullyCompletedSteps = 0;
    
    stepKeys.forEach(stepKey => {
      const details = getStepCompletionDetails(stepKey);
      totalRequiredQuestions += details.requiredQuestions;
      answeredRequiredQuestions += details.answeredRequired;
      
      // A step is fully complete if all required questions are answered
      if (details.isComplete) {
        fullyCompletedSteps++;
      }
    });
    
    const totalSteps = stepKeys.length;
    const questionCompletionPercentage = totalRequiredQuestions > 0 
      ? Math.round((answeredRequiredQuestions / totalRequiredQuestions) * 100)
      : 0;
    const stepCompletionPercentage = Math.round((fullyCompletedSteps / totalSteps) * 100);
    
    // Weighted completion: 70% based on required questions, 30% based on steps
    const weightedPercentage = Math.round(
      (questionCompletionPercentage * 0.7) + (stepCompletionPercentage * 0.3)
    );
    
    return {
      completed: fullyCompletedSteps,
      total: totalSteps,
      percentage: weightedPercentage,
      questionCompletion: {
        answered: answeredRequiredQuestions,
        total: totalRequiredQuestions,
        percentage: questionCompletionPercentage
      },
      stepCompletion: {
        completed: fullyCompletedSteps,
        total: totalSteps,
        percentage: stepCompletionPercentage
      }
    };
  };

  // Get comments for current step
  const getCurrentStepComments = () => {
    const stepKey = getStepKey(currentStep);
    return comments.filter(c => 
      c.stepNumber === currentStep || c.stepKey === stepKey
    );
  };

  // Get all step comments (for dashboard)
  const getStepComments = (stepNumber) => {
    const stepKey = getStepKey(stepNumber);
    return comments.filter(c => 
      c.stepNumber === stepNumber || c.stepKey === stepKey
    );
  };

  // Add comment (Super Admin only)
  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const stepKey = getStepKey(currentStep);
      const response = await fetch(`/api/forms/${formId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: commentText,
          status: commentStatus,
          stepNumber: currentStep,
          stepKey: stepKey,
        }),
      });

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If we get HTML instead of JSON, it means the API route failed
        const text = await response.text();
        logger.error('API returned non-JSON response:', text.substring(0, 200));
        throw new Error(`Server error: API returned ${response.status} ${response.statusText}. Please try again.`);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add comment' }));
        throw new Error(error.error || error.message || 'Failed to add comment');
      }

      const result = await response.json().catch(error => {
        logger.error('Failed to parse JSON response:', error);
        throw new Error('Invalid response from server. Please try again.');
      });
      
      // Reload comments
      const formResponse = await fetch(`/api/forms/${formId}`);
      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData.comments) {
          setComments(formData.comments);
        }
      }

      setCommentText('');
      setShowCommentModal(false);
      toast.success('Comment added');
    } catch (error) {
      logger.error('Error adding comment:', error);
      toast.error(`Failed to add comment: ${error.message}`);
    }
  };

  // Share form with email addresses
  const handleShareForm = async () => {
    if (!shareEmails.trim()) {
      toast.error('Please enter at least one email address');
      return;
    }

    setSharing(true);
    try {
      // Parse emails (comma or newline separated)
      const emails = shareEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (emails.length === 0) {
        toast.error('Please enter at least one valid email address');
        setSharing(false);
        return;
      }

      const response = await fetch(`/api/forms/${formId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          permissions: sharePermissions,
        }),
      });

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        logger.error('API returned non-JSON response:', text.substring(0, 200));
        throw new Error(`Server error: API returned ${response.status} ${response.statusText}. Please try again.`);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to share form' }));
        throw new Error(error.error || error.message || 'Failed to share form');
      }

      const result = await response.json().catch(error => {
        logger.error('Failed to parse JSON response:', error);
        throw new Error('Invalid response from server. Please try again.');
      });

      // Reload shared emails
      await loadSharedEmails();

      setShareEmails('');
      setShowShareModal(false);
      toast.success(`Shared with ${emails.length} email${emails.length === 1 ? '' : 's'}`);
    } catch (error) {
      logger.error('Error sharing form:', error);
      toast.error(`Failed to share form: ${error.message}`);
    } finally {
      setSharing(false);
    }
  };

  // Load shared email addresses
  const loadSharedEmails = async () => {
    if (session?.user?.level !== 5) return;

    try {
      const response = await fetch(`/api/forms/${formId}/share`);
      if (response.ok) {
        const data = await response.json();
        setSharedWithEmails(data.sharedWithEmails || []);
      }
    } catch (error) {
      logger.error('Error loading shared emails:', error);
    }
  };

  // Remove shared email
  const handleRemoveSharedEmail = async (email) => {
    setUnshareEmail(email);
  };

  const confirmRemoveSharedEmail = async () => {
    const email = unshareEmail;
    setUnshareEmail('');
    try {
      const response = await fetch(`/api/forms/${formId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [email] }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to remove email' }));
        throw new Error(error.error || 'Failed to remove email');
      }

      await loadSharedEmails();
      toast.success('Email removed from shared list');
    } catch (error) {
      logger.error('Error removing shared email:', error);
      toast.error(`Failed to remove email: ${error.message}`);
    }
  };

  // Mark comment as read or fixed
  const handleMarkComment = async (commentId, action) => {
    try {
      const response = await fetch(`/api/forms/${formId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to mark comment as ${action}`);
      }

      // Reload comments
      const formResponse = await fetch(`/api/forms/${formId}`);
      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData.comments) {
          setComments(formData.comments);
        }
      }

      if (action === 'fixed') {
        toast.success('Comment marked as fixed');
      }
    } catch (error) {
      logger.error(`Error marking comment as ${action}:`, error);
      toast.error(`Failed to mark comment: ${error.message}`);
    }
  };

  const handleAttestConfirm = async () => {
    const response = await fetch(`/api/forms/${formId}/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: attestName }),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error || 'Could not save attestation');
      return;
    }
    setAttestation(payload.attestation);
    setShowAttestModal(false);
    performSubmit();
  };

  const canManageSharing = session?.user?.level === 5;

  // Don't render until session and form data are loaded
  if (status === 'loading' || !session || loading || questionBankLoading || questionBank.source === 'loading') {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading form...</Text>
      </Column>
    );
  }


  return (
    <FormWorkspace
      session={session}
      isPrintView={isPrintView}
      formData={formData}
      currentStep={currentStep}
      formSteps={FORM_STEPS.map((step) => ({
        ...step,
        completed: getStepCompletionDetails(step.key).isComplete,
      }))}
      completion={getCompletionStatus()}
      userPermissions={userPermissions}
      autoSaving={autoSaving || savingDraft}
      lastSaved={lastSaved}
      saveError={saveError}
      showSaveReminder={showSaveReminder}
      redirecting={redirecting}
      redirectCountdown={redirectCountdown}
      onCancelRedirect={cancelRedirect}
      onDismissReminder={() => setShowSaveReminder(false)}
      onDismissError={() => setSaveError(null)}
      onNavigateStep={navigateToStep}
      previewNotice={
        previewDraftBank && questionBank.source === 'draft'
          ? 'Previewing the unpublished question bank. Principals still see the last published version until you publish. Paste from Excel into the table grid, not a text box.'
          : ''
      }
      headerActions={
        <Row gap="8" wrap>
          <Button size="s" variant="tertiary" href={`/form/${formId}/compare`}>
            Compare years
          </Button>
          {session?.user?.level >= 4 && (
            <Button size="s" variant="tertiary" onClick={() => setShowDuplicateModal(true)}>
              Duplicate
            </Button>
          )}
          {canManageSharing && (
            <Button size="s" variant="tertiary" onClick={() => setShowShareModal(true)}>
              Share
            </Button>
          )}
          {session?.user?.level === 5 && (
            <Button size="s" variant="tertiary" onClick={() => setShowCommentModal(true)}>
              Comment
            </Button>
          )}
          <Button size="s" variant="tertiary" href={`/view/${formId}`}>
            View all
          </Button>
          {!formLocked && userPermissions !== 'view' && (
            <Button
              size="s"
              variant="primary"
              onClick={handleSaveDraft}
              disabled={saving || savingDraft || redirecting}
            >
              {savingDraft ? 'Saving draft…' : 'Save draft'}
            </Button>
          )}
          <Button
            size="s"
            variant="primary"
            className="app-btn-submit"
            onClick={handleSubmit}
            disabled={saving || savingDraft || redirecting || formLocked}
          >
            {formLocked ? 'Read-only' : saving ? 'Submitting…' : 'Submit'}
          </Button>
        </Row>
      }
      locked={formLocked}
      yearArchived={yearArchived}
      allowEditsWhenArchived={allowEditsWhenArchived}
      deadlineLabel={(() => {
        const stepKey = FORM_STEPS[currentStep - 1]?.key;
        const due = formDeadlines.find((item) => item.stepKey === stepKey)?.dueDate;
        return due ? `Due ${new Date(due).toLocaleDateString()}` : '';
      })()}
      footer={
        <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
          <Button size="s" variant="secondary" onClick={handlePrevious} disabled={currentStep === 1 || saving || savingDraft || redirecting}>
            Previous
          </Button>
          <Row gap="8" vertical="center" wrap>
            {(() => {
              const lock = activeLocks[getStepKey(currentStep)];
              if (lock && !lock.isCurrentUser) {
                return (
                  <Text variant="label-default-s" onBackground="danger-strong">
                    Being edited by {lock.lockedBy.userName || lock.lockedBy.email}
                  </Text>
                );
              }
              return null;
            })()}
            {!formLocked && userPermissions !== 'view' && (
              <Button
                size="s"
                variant="primary"
                onClick={handleSaveDraft}
                disabled={saving || savingDraft || redirecting}
              >
                {savingDraft ? 'Saving draft…' : 'Save draft'}
              </Button>
            )}
            <Button size="s" variant="secondary" onClick={handleNext} disabled={formLocked || saving || savingDraft || redirecting || currentStep === FORM_STEPS.length}>
              Next
            </Button>
          </Row>
        </Row>
      }
    >
      <FormStepMeta
        comments={getCurrentStepComments()}
        onMarkRead={(id) => handleMarkComment(id, 'read')}
        onMarkFixed={(id) => handleMarkComment(id, 'fixed')}
        activeEditors={activeEditors}
        currentUser={session?.user}
        formSteps={FORM_STEPS}
        sharedWith={sharedWithEmails}
        onRemoveShare={handleRemoveSharedEmail}
        canManageSharing={canManageSharing}
      />


          {/* Dynamic Form Content */}
          {renderFormStep()}

      {currentStep === FORM_STEPS.length && (
        <FormSubmitSummary
          steps={FORM_STEPS}
          completion={getCompletionStatus()}
          getStepDetails={getStepCompletionDetails}
          onGoToStep={navigateToStep}
        />
      )}


      {/* Scroll to Top Button */}
      {!isPrintView && <ScrollToTop />}

      {showAttestModal && (
        <FormAttestModal
          schoolYear={formData.schoolYear}
          name={attestName}
          onChangeName={setAttestName}
          onClose={() => setShowAttestModal(false)}
          onConfirm={handleAttestConfirm}
        />
      )}

      {showDuplicateModal && (
        <DuplicateFormModal
          form={{
            _id: formId,
            schoolName: formData.schoolName,
            schoolYear: formData.schoolYear,
            createdAt: formData.createdAt,
          }}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      {showShareModal && canManageSharing && (
        <FormShareModal
          emails={shareEmails}
          onChangeEmails={setShareEmails}
          permissions={sharePermissions}
          onChangePermissions={setSharePermissions}
          sharedWith={sharedWithEmails}
          sharing={sharing}
          onClose={() => {
            setShowShareModal(false);
            setShareEmails('');
          }}
          onShare={handleShareForm}
        />
      )}

      {showCommentModal && session?.user?.level === 5 && (
        <FormCommentModal
          stepNumber={currentStep}
          stepTitle={FORM_STEPS[currentStep - 1]?.title}
          status={commentStatus}
          onChangeStatus={setCommentStatus}
          comment={commentText}
          onChangeComment={setCommentText}
          onClose={() => {
            setShowCommentModal(false);
            setCommentText('');
          }}
          onSubmit={handleAddComment}
        />
      )}

      {submitConfirm && (
        <FormConfirmModal
          title="Submit this plan?"
          description={`${formData.schoolName} · ${submitConfirm.completion.completed}/${submitConfirm.completion.total} sections complete. It will go to district review. You can still edit afterward if needed.`}
          warnings={submitConfirm.warnings}
          confirmLabel="Submit"
          onClose={() => setSubmitConfirm(null)}
          onConfirm={continueAfterSubmitConfirm}
          busy={saving}
        />
      )}

      {unshareEmail && (
        <FormConfirmModal
          title="Remove access?"
          description={`${unshareEmail} will no longer be able to open this plan.`}
          confirmLabel="Remove"
          onClose={() => setUnshareEmail('')}
          onConfirm={confirmRemoveSharedEmail}
        />
      )}
    </FormWorkspace>
  );
}

export default function FormPage() {
  return (
    <Suspense fallback={
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading form...</Text>
      </Column>
    }>
      <FormPageContent />
    </Suspense>
  );
}
