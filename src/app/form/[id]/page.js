'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
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
import { Spinner, Column, Row, Text, Button } from '@once-ui-system/core';

function FormPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id;
  const { data: session, status } = useSession();
  const toast = useAppToast();

  const [currentStep, setCurrentStep] = useState(1);
  const currentStepRef = useRef(1);
  const formHydratedRef = useRef(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    status: 'draft'
  });
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
  const [collaborationInfo, setCollaborationInfo] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null); // 'owner', 'edit', 'view', or null
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [redirectTimeout, setRedirectTimeout] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [saveReminderTimeout, setSaveReminderTimeout] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [comments, setComments] = useState([]); // All comments for this form
  const [showCommentModal, setShowCommentModal] = useState(false); // For super admin to add comments
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState('under_review');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(null);
  const [unshareEmail, setUnshareEmail] = useState('');
  const [attestName, setAttestName] = useState('');
  const [needsUpdate, setNeedsUpdate] = useState([]);
  const [formLocked, setFormLocked] = useState(false);
  const [yearArchived, setYearArchived] = useState(false);
  const [allowEditsWhenArchived, setAllowEditsWhenArchived] = useState(false);
  const [formDeadlines, setFormDeadlines] = useState([]);
  const [attestation, setAttestation] = useState(null);
  const [duplicatedFrom, setDuplicatedFrom] = useState(null);
  const [shareEmails, setShareEmails] = useState('');
  const [sharePermissions, setSharePermissions] = useState('view');
  const [sharedWithEmails, setSharedWithEmails] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [activeLocks, setActiveLocks] = useState({}); // { stepKey: { lockedBy: { userName, email }, lockedAt, expiresAt } }
  const [currentLockedStep, setCurrentLockedStep] = useState(null); // Track which step we have locked
  const [activeEditors, setActiveEditors] = useState([]); // Array of active editors: [{ userId, userName, email, stepKey, lastSeen }]

  // Check if this is a print view
  const isPrintView = searchParams.get('print') === 'true';

  // Handle print functionality
  useEffect(() => {
    if (isPrintView) {
      // Hide navigation elements for print
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
      
      // Auto-print when page loads
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isPrintView]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Load form data when session and formId are available
  useEffect(() => {
    if (session?.user && formId && formId !== 'undefined' && formId !== 'null') {
      loadFormData();
    } else if (session && (!formId || formId === 'undefined' || formId === 'null')) {
      console.error('Invalid form ID:', formId);
      toast.error('Invalid form ID. Redirecting to dashboard…');
      setTimeout(() => router.push('/dashboard'), 500);
    }
    // session object identity changes often; only reload when the user or form changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, formId]);

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

  // Function to fetch active editors for the form
  const fetchActiveEditors = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/editors`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.editors) {
          setActiveEditors(data.editors);
        }
      }
    } catch (error) {
      console.error('Error fetching active editors:', error);
    }
  };

  // Function to register as active editor for current step
  const registerAsActiveEditor = async (step = currentStep) => {
    if (!formId || !session) return;
    
    const stepKey = getStepKey(step);
    try {
      await fetch(`/api/forms/${formId}/editors/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stepKey }),
      });
    } catch (error) {
      console.error('Error registering as active editor:', error);
    }
  };

  // Function to fetch active locks for the form
  const fetchActiveLocks = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/locks`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.locks) {
          const locksMap = {};
          data.locks.forEach(lock => {
            locksMap[lock.stepKey] = lock;
          });
          setActiveLocks(locksMap);
        }
      }
    } catch (error) {
      console.error('Error fetching locks:', error);
    }
  };

  // Function to release the current lock
  const releaseCurrentLock = async () => {
    if (!currentLockedStep || !formId) return;
    
    try {
      const response = await fetch(`/api/forms/${formId}/step/${currentLockedStep.stepNumber}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setCurrentLockedStep(null);
        console.log('Lock released successfully');
      }
    } catch (error) {
      console.error('Error releasing lock:', error);
      // Don't throw - this is cleanup, failure is okay
    }
  };

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

  // Register as active editor and poll for active editors when step changes
  useEffect(() => {
    if (!formId || !session) return;
    
    // Register as active editor for current step
    const stepKey = getStepKey(currentStep);
    registerAsActiveEditor();
    
    // Fetch active editors
    fetchActiveEditors();
    
    // Poll for active editors every 5 seconds (heartbeat)
    const editorInterval = setInterval(() => {
      registerAsActiveEditor(); // Re-register to refresh TTL
      fetchActiveEditors(); // Fetch all active editors
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(editorInterval);
  }, [formId, session, currentStep]);

  // Enhanced save function with retry logic for connection issues
  const saveCurrentStep = async (retries = 3, mergeStrategy = 'reject') => {
    // Check permissions before attempting to save
    if (userPermissions === 'view') {
      const error = new Error('You only have view permissions on this form. Please contact an administrator to grant edit access.');
      setSaveError(error.message);
      throw error;
    }
    if (formLocked) {
      const error = new Error('This school year is archived and read-only.');
      setSaveError(error.message);
      throw error;
    }
    
    const currentStepData = getCurrentStepData();
    const hasData = Object.keys(currentStepData).length > 0;
    
    // Don't save if there's no data to save
    if (!hasData) {
      return { success: true, message: 'No data to save' };
    }
    
    // Get step key and number
    const stepKey = getStepKey(currentStep);
    const stepNumber = currentStep;
    
    if (!stepKey || !stepNumber) {
      throw new Error('Unknown step');
    }
    
    // Get current step's lastUpdated timestamp for conflict detection
    const currentStepDataObj = stepData[stepKey];
    const lastUpdated = currentStepDataObj?.lastUpdated || null;
    
    // Use step-level API endpoint for atomic updates with conflict detection
    const apiPayload = {
      stepData: currentStepData,
      lastUpdated: lastUpdated,
      revisionCount: currentStepDataObj?.revisionCount ?? 0,
      mergeStrategy: mergeStrategy
    };

    // Log that we're using the new step-level API (for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 Using step-level API: /api/forms/${formId}/step/${stepNumber}`, {
        stepKey,
        stepNumber,
        hasData,
        lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : 'null',
        mergeStrategy
      });
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create timeout controller for fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`/api/forms/${formId}/step/${stepNumber}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId); // Clear timeout if request completes

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          let errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
          
          // Handle 423 Locked - step is currently being edited by another user
          if (response.status === 423 && errorData.lockedBy) {
            const lockedMessage = errorData.message || `This step is currently being edited by ${errorData.lockedBy.userName || errorData.lockedBy.email}. Please wait and try again.`;
            setSaveError(lockedMessage);
            throw new Error(lockedMessage);
          }
          
          // Handle 409 Conflict - data was modified by another user
          if (response.status === 409 && errorData.conflict) {
            // Show conflict warning to user
            const conflictMessage = errorData.message || 'This step was modified by another user. Please refresh to see the latest changes.';
            
            // If merge strategy is 'merge', try to merge and retry
            if (mergeStrategy === 'merge' && attempt < retries) {
              // Merge client data with server data
              const mergedData = { ...errorData.serverData };
              Object.keys(currentStepData).forEach(key => {
                // Only merge if field wasn't changed on server
                if (!mergedData[key] || JSON.stringify(mergedData[key]) === JSON.stringify(errorData.serverData[key])) {
                  mergedData[key] = currentStepData[key];
                }
              });
              
              // Update local state with merged data
              setStepData(prev => ({
                ...prev,
                [stepKey]: {
                  ...prev[stepKey],
                  data: mergedData,
                  lastUpdated: errorData.serverLastUpdated,
                  revisionCount: errorData.serverRevision
                }
              }));
              
              // Retry with merged data
              apiPayload.stepData = mergedData;
              apiPayload.lastUpdated = errorData.serverLastUpdated;
              apiPayload.revisionCount = errorData.serverRevision;
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            
            // For 'last-write-wins' or 'reject', show error
            setSaveError(conflictMessage);
            throw new Error(conflictMessage);
          }
          
          // Check if it's a retryable error (database connection issue)
          const isRetryable = response.status === 503 || 
                             errorData.retryable === true ||
                             errorMessage.toLowerCase().includes('connection') ||
                             errorMessage.toLowerCase().includes('database') ||
                             errorMessage.toLowerCase().includes('timeout');
          
          // If it's retryable and we have retries left, retry
          if (isRetryable && attempt < retries) {
            const delay = 1000 * (attempt + 1); // Exponential backoff: 1s, 2s, 3s
            console.log(`Save failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          }
          
          // Provide more helpful error messages for permission issues
          if (response.status === 403) {
            // Check if it's actually a database connection issue masquerading as permission error
            if (errorMessage.toLowerCase().includes('unable to verify') || 
                errorMessage.toLowerCase().includes('connection') ||
                errorMessage.toLowerCase().includes('database')) {
              errorMessage = 'Database connection issue: Unable to verify permissions. Please try again in a moment.';
            } else {
              errorMessage = errorData.message || 'Access denied: You do not have permission to edit this form. Please contact an administrator to grant edit access.';
            }
          }
          
          const error = new Error(errorMessage);
          setSaveError(errorMessage);
          throw error;
        }

        const result = await response.json();
        
        // Clear any previous errors on successful save
        setSaveError(null);
        
        // Update local state with server response (includes lastUpdated, revisionCount, etc.)
        if (result.stepData) {
          setStepData(prev => ({
            ...prev,
                [stepKey]: {
                  ...prev[stepKey],
                  ...result.stepData,
                  data: result.stepData?.data || currentStepData,
                  lastUpdated: result.lastUpdated,
                  revisionCount: result.revisionCount
                }
          }));
        } else {
          // Fallback: update with what we know
          setStepData(prev => ({
            ...prev,
            [stepKey]: {
              ...prev[stepKey],
              completed: hasData,
              data: currentStepData,
              lastUpdated: result.lastUpdated || new Date(),
              revisionCount: result.revisionCount
            }
          }));
        }

        // Update last saved timestamp
        setLastSaved(new Date());
        
        // Track that we have a lock on this step (lock is acquired by the API on save)
        setCurrentLockedStep({ stepKey, stepNumber });
        
        return result;
      } catch (fetchError) {
        // Handle network errors, timeouts, and connection issues
        const isNetworkError = fetchError.name === 'AbortError' ||
                              fetchError.name === 'TypeError' ||
                              fetchError.message?.includes('fetch') ||
                              fetchError.message?.includes('network') ||
                              fetchError.message?.includes('timeout');
        
        if (isNetworkError && attempt < retries) {
          const delay = 1000 * (attempt + 1); // Exponential backoff
          console.log(`Network error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }
        
        // If all retries failed or it's not a network error, throw
        const errorMessage = isNetworkError 
          ? 'Unable to connect to server. Please check your internet connection and try again.'
          : fetchError.message || 'Failed to save form data';
        
        setSaveError(errorMessage);
        throw new Error(errorMessage);
      }
    }
  };

  // Check if current step has unsaved changes
  const hasUnsavedChanges = () => {
    const currentStepData = getCurrentStepData();
    return Object.keys(currentStepData).length > 0;
  };

  // Enhanced navigation with unsaved changes warning
  // Release lock when navigating to a different step
  useEffect(() => {
    if (currentLockedStep && currentLockedStep.stepKey !== getStepKey(currentStep)) {
      // User navigated to a different step, release the previous step's lock
      releaseCurrentLock();
    }
  }, [currentStep, currentLockedStep]);

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
          console.error('Error auto-saving step:', error);
          
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
          console.error('Error auto-saving step:', error);
          
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

  // Enhanced updateStepData with optimized auto-save capability
  const updateStepData = (stepKey, data) => {
    const actualStepKey = bankStepKeys.includes(stepKey) ? stepKey : getStepKey(currentStep);
    
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

    // Debounced auto-save after 3 seconds of inactivity
    const stepKeyToSave = actualStepKey;
    const dataToSave = { ...data };
    
    if (window.autoSaveTimeout) {
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = null;
    }
    
    if (window.autoSaveInProgress) {
      window.pendingAutoSaveData = { stepKey: stepKeyToSave, data: dataToSave };
      return;
    }

    const flushAutoSave = (saveData) => {
      if (!saveData?.data || Object.keys(saveData.data).length === 0) return;
      window.autoSaveInProgress = true;
      saveStepDataDirectly(saveData.stepKey, saveData.data, true)
        .then(() => {
          window.autoSaveInProgress = false;
          const pending = window.pendingAutoSaveData;
          window.pendingAutoSaveData = null;
          if (pending) {
            window.autoSaveTimeout = setTimeout(() => flushAutoSave(pending), 3000);
          }
        })
        .catch((error) => {
          console.error('Auto-save failed:', error);
          window.autoSaveInProgress = false;
        });
    };
    
    window.autoSaveTimeout = setTimeout(() => {
      const saveData = window.pendingAutoSaveData || { stepKey: stepKeyToSave, data: dataToSave };
      window.pendingAutoSaveData = null;
      flushAutoSave(saveData);
    }, 3000);
  };

  const getCurrentStepData = () => {
    const stepKey = getStepKey(currentStep);
    const data = stepData[stepKey]?.data || {};
    
    // Ensure we always return the data, even if it's empty
    return data;
  };

  // Helper function to save step data directly using step-level API (prevents overwrites)
  const saveStepDataDirectly = async (stepKey, stepDataToSave, silent = true, mergeStrategy = 'merge') => {
    if (!stepDataToSave || Object.keys(stepDataToSave).length === 0) {
      return { success: true, message: 'No data to save' };
    }
    
    // Check permissions before attempting to save
    if (userPermissions === 'view') {
      if (!silent) {
        const error = new Error('You only have view permissions on this form. Please contact an administrator to grant edit access.');
        setSaveError(error.message);
        throw error;
      }
      return { success: false, message: 'View-only permissions' };
    }
    
    const stepNumber = getStepNumberFromKey(stepKey);
    
    if (!stepNumber) {
      console.error('Unknown step key:', stepKey);
      return { success: false, message: 'Unknown step' };
    }
    
    // Get current step's lastUpdated timestamp for conflict detection
    const currentStepData = stepData[stepKey];
    const lastUpdated = currentStepData?.lastUpdated || null;
    
    // Use step-level API endpoint for atomic updates
    const apiPayload = {
      stepData: stepDataToSave,
      lastUpdated: lastUpdated,
      revisionCount: currentStepData?.revisionCount ?? 0,
      mergeStrategy: mergeStrategy
    };
    
    const retries = 3;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`/api/forms/${formId}/step/${stepNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle 409 Conflict - data was modified by another user
          if (response.status === 409 && errorData.conflict) {
            if (!silent) {
              // Show conflict warning to user
              const conflictMessage = errorData.message || 'This step was modified by another user. Please refresh to see the latest changes.';
              setSaveError(conflictMessage);
              
              // Optionally, we could merge the data here
              // For now, we'll just show the error and let user refresh
              console.warn('Conflict detected:', errorData);
            }
            
            // If merge strategy is 'merge', try to merge and retry
            if (mergeStrategy === 'merge' && attempt < retries) {
              // Merge client data with server data
              const mergedData = { ...errorData.serverData };
              Object.keys(stepDataToSave).forEach(key => {
                // Only merge if field wasn't changed on server
                if (!mergedData[key] || JSON.stringify(mergedData[key]) === JSON.stringify(errorData.serverData[key])) {
                  mergedData[key] = stepDataToSave[key];
                }
              });
              
              // Update local state with merged data
              setStepData(prev => ({
                ...prev,
                [stepKey]: {
                  ...prev[stepKey],
                  data: mergedData,
                  lastUpdated: errorData.serverLastUpdated,
                  revisionCount: errorData.serverRevision
                }
              }));
              
              // Retry with merged data
              apiPayload.stepData = mergedData;
              apiPayload.lastUpdated = errorData.serverLastUpdated;
              apiPayload.revisionCount = errorData.serverRevision;
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            
            return { 
              success: false, 
              message: errorData.message || 'Conflict detected',
              conflict: true,
              serverData: errorData.serverData
            };
          }
          
          // Handle 429 (Too Many Requests) specifically
          if (response.status === 429) {
            const retryAfter = errorData.retryAfter || 5;
            console.warn(`Rate limited (429), waiting ${retryAfter} seconds before retry`);
            
            if (attempt < retries) {
              const delay = retryAfter * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            const errorMessage = 'Too many requests. Please wait a moment and try again.';
            if (!silent) {
              setSaveError(errorMessage);
              throw new Error(errorMessage);
            }
            return { success: false, message: errorMessage };
          }
          
          const isRetryable = response.status === 503 || 
                             errorData.retryable === true ||
                             errorData.message?.toLowerCase().includes('connection') ||
                             errorData.message?.toLowerCase().includes('database') ||
                             errorData.message?.toLowerCase().includes('timeout');
          
          if (isRetryable && attempt < retries) {
            const delay = 1000 * (attempt + 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          if (!silent) {
            const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
            setSaveError(errorMessage);
            throw new Error(errorMessage);
          }
          return { success: false, message: errorData.message || 'Save failed' };
        }
        
        const result = await response.json();
        
        // Update local state with server response
        if (result.stepData) {
          setStepData(prev => ({
            ...prev,
            [stepKey]: {
              ...prev[stepKey],
              ...result.stepData,
              lastUpdated: result.lastUpdated,
              revisionCount: result.revisionCount
            }
          }));
        }
        
        if (!silent) {
          setSaveError(null);
          setLastSaved(new Date());
        }
        return result;
      } catch (fetchError) {
        const isNetworkError = fetchError.name === 'AbortError' ||
                              fetchError.name === 'TypeError' ||
                              fetchError.message?.includes('fetch') ||
                              fetchError.message?.includes('network') ||
                              fetchError.message?.includes('timeout');
        
        if (isNetworkError && attempt < retries) {
          const delay = 1000 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (!silent) {
          const errorMessage = isNetworkError 
            ? 'Unable to connect to server. Please check your internet connection and try again.'
            : fetchError.message || 'Failed to save form data';
          setSaveError(errorMessage);
          throw new Error(errorMessage);
        }
        return { success: false, message: fetchError.message || 'Save failed' };
      }
    }
    
    return { success: false, message: 'Save failed after retries' };
  };

  // Auto-save function that can be called periodically or on blur
  const autoSave = async (silent = true) => {
    const currentStepData = getCurrentStepData();
    if (Object.keys(currentStepData).length > 0) {
      try {
        // Only show indicator if not silent (for manual saves)
        if (!silent) {
          setAutoSaving(true);
        }
        await saveCurrentStep();
        setLastSaved(new Date());
        // Auto-save completed successfully - silent, no alerts
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show alert for auto-save failures to avoid interrupting user
      } finally {
        if (!silent) {
          setAutoSaving(false);
        }
      }
    }
  };

  // Auto-save when user leaves a step (component unmounts or step changes)
  useEffect(() => {
    // Don't auto-save during step navigation - it's causing state issues
    // Auto-save will happen through the navigation functions instead
  }, [currentStep, stepData]);

  // Backup periodic save in case debounce is skipped while a save is in flight
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.autoSaveInProgress || window.autoSaveTimeout) {
        return;
      }
      
      const stepKey = getStepKey(currentStep);
      const currentStepData = stepData[stepKey]?.data || {};
      if (Object.keys(currentStepData).length > 0) {
        window.autoSaveInProgress = true;
        saveStepDataDirectly(stepKey, currentStepData, true)
          .then(() => {
            window.autoSaveInProgress = false;
          })
          .catch(() => {
            window.autoSaveInProgress = false;
          });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentStep, stepData]);

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

  // Load shared emails when form loads (for Level 5 users)
  useEffect(() => {
    if (session?.user?.level === 5 && formId) {
      loadSharedEmails();
    }
  }, [session, formId]);

  // Enhanced loadFormData with better error handling
  const loadFormData = async ({ silent = false } = {}) => {
    if (!silent && !formHydratedRef.current) setLoading(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        console.error('Error loading form:', errorMessage, response.status);
        
        // If it's a permission error, redirect to dashboard
        if (response.status === 403 || response.status === 401) {
          toast.error(`Access denied: ${errorMessage}`);
          router.push('/dashboard');
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.form) {
        console.error('No form data in response:', data);
        throw new Error('Form data not found in response');
      }
      
      if (data.form) {
        setFormData({
          schoolName: data.form.schoolName || '',
          status: data.form.status || 'draft',
          schoolYear: data.form.schoolYear || '',
          createdAt: data.form.createdAt,
          questionBankVersion: data.form.questionBankVersion || null,
        });
        setFormLocked(Boolean(data.form.locked));
        setYearArchived(Boolean(data.form.yearArchived));
        setAllowEditsWhenArchived(Boolean(data.form.allowEditsWhenArchived));
        setNeedsUpdate(data.form.needsUpdate || []);
        setFormDeadlines(data.form.deadlines || []);
        setAttestation(data.form.attestation || null);
        setDuplicatedFrom(data.form.duplicatedFrom || null);
        const serverStep = Number(data.form.currentStep) || 1;
        if (!formHydratedRef.current) {
          formHydratedRef.current = true;
          if (currentStepRef.current === 1 && serverStep > 1) {
            currentStepRef.current = serverStep;
            setCurrentStep(serverStep);
          }
        }
        // Register as active editor when form loads
        if (formId && session) {
          const stepKey = getStepKey(data.form.currentStep || 1);
          registerAsActiveEditor();
        }
        
        // Set collaboration info if available
        if (data.collaborationInfo) {
          setCollaborationInfo(data.collaborationInfo);
        }
        
        // Use permission from API response if available, otherwise calculate it
        if (data.userPermission) {
          setUserPermissions(data.userPermission);
        } else {
          // Fallback: Determine user permissions from form data
          const formUserId = data.form.userId?._id?.toString() || data.form.userId?.toString();
          const currentUserId = session?.user?.id || session?.user?._id;
          const isOwner = formUserId === currentUserId;
          const isSuperAdmin = session?.user?.level === 5;
          const isPrincipal = session?.user?.level === 4;
          const isLevel2 = session?.user?.level === 2;
          const isAssistantPrincipal = session?.user?.level === 3;
          // Level 2 and Level 4 users can edit forms from their school
          const isSameSchool = (isPrincipal || isLevel2) && session?.user?.schoolName && data.form.schoolName && 
                             session.user.schoolName === data.form.schoolName;
          
          let permissions = null;
          if (isOwner || isSuperAdmin) {
            permissions = 'owner';
          } else if (isSameSchool) {
            permissions = 'edit';
          } else if (data.collaborationInfo) {
            // Level 3 users assigned for collaboration can always edit
            if (isAssistantPrincipal) {
              permissions = 'edit';
            } else {
              permissions = data.collaborationInfo.permissions || 'view';
            }
          } else {
            permissions = 'view';
          }
          
          setUserPermissions(permissions);
        }
        
        // Ensure stepData is properly initialized with all steps
        const loadedStepData = data.form.formData || {};
        const stepKeys = bankStepKeys.length ? bankStepKeys : [
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
            completed: Boolean(stepInfo?.completed) || Object.keys(stepData).length > 0,
            data: stepData,
            startedAt: stepInfo?.startedAt || null,
            lastUpdated: stepInfo?.lastUpdated || null,
            timeSpent: stepInfo?.timeSpent || 0,
            revisionCount: stepInfo?.revisionCount || 0
          };
        });
        
        
        setStepData(initializedStepData);
        
        // Load comments if available
        if (data.comments) {
          setComments(data.comments);
        }
      }
    } catch (error) {
      console.error('Error loading form:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Show error to user before redirecting
      toast.error(`Failed to load form: ${errorMessage}`);
      
      // Redirect back to dashboard after showing error
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } finally {
      setLoading(false);
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
        console.log(`✅ Step ${currentStep} saved before navigating to step ${stepNumber}`);
      } catch (error) {
        console.error('Error saving before navigation:', error);
        
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
      console.error('Error saving draft:', error);
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
      console.error('Error preparing submission:', error);
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
        const countdownInterval = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        const timeoutRef = setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
        setRedirectTimeout(timeoutRef);
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
        console.error('API returned non-JSON response:', text.substring(0, 200));
        throw new Error(`Server error: API returned ${response.status} ${response.statusText}. Please try again.`);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add comment' }));
        throw new Error(error.error || error.message || 'Failed to add comment');
      }

      const result = await response.json().catch(error => {
        console.error('Failed to parse JSON response:', error);
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
      console.error('Error adding comment:', error);
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
        console.error('API returned non-JSON response:', text.substring(0, 200));
        throw new Error(`Server error: API returned ${response.status} ${response.statusText}. Please try again.`);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to share form' }));
        throw new Error(error.error || error.message || 'Failed to share form');
      }

      const result = await response.json().catch(error => {
        console.error('Failed to parse JSON response:', error);
        throw new Error('Invalid response from server. Please try again.');
      });

      // Reload shared emails
      await loadSharedEmails();

      setShareEmails('');
      setShowShareModal(false);
      toast.success(`Shared with ${emails.length} email${emails.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Error sharing form:', error);
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
      console.error('Error loading shared emails:', error);
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
      console.error('Error removing shared email:', error);
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
      console.error(`Error marking comment as ${action}:`, error);
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

  const canManageSharing = session?.user?.level === 5 || session?.user?.email?.toLowerCase() === 'jjaramillo7@gmail.com';

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
