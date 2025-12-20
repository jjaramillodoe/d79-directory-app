'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  Shield,
  MessageSquare,
  Check,
  Eye,
  Edit,
  Share2,
  Mail,
  Users,
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
import formQuestionsData from '../../../data/formQuestions.json';

export default function FormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id;
  const { data: session, status } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: '',
    status: 'draft'
  });
  const [collaborationInfo, setCollaborationInfo] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null); // 'owner', 'edit', 'view', or null
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
  const [saveError, setSaveError] = useState(null);
  const [comments, setComments] = useState([]); // All comments for this form
  const [showCommentModal, setShowCommentModal] = useState(false); // For super admin to add comments
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState('under_review');
  const [showShareModal, setShowShareModal] = useState(false);
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

  // Load form data when session and formId are available
  useEffect(() => {
    if (session && formId && formId !== 'undefined' && formId !== 'null') {
      loadFormData();
    } else if (session && (!formId || formId === 'undefined' || formId === 'null')) {
      console.error('Invalid form ID:', formId);
      alert('Invalid form ID. Redirecting to dashboard...');
      setTimeout(() => router.push('/dashboard'), 500);
    }
  }, [session, formId, router]);

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
  const saveCurrentStep = async (retries = 3, mergeStrategy = 'last-write-wins') => {
    // Check permissions before attempting to save
    if (userPermissions === 'view') {
      const error = new Error('You only have view permissions on this form. Please contact an administrator to grant edit access.');
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
    const stepNumberMap = {
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
    const stepNumber = stepNumberMap[stepKey];
    
    if (!stepNumber) {
      throw new Error('Unknown step');
    }
    
    // Get current step's lastUpdated timestamp for conflict detection
    const currentStepDataObj = stepData[stepKey];
    const lastUpdated = currentStepDataObj?.lastUpdated || null;
    
    // Use step-level API endpoint for atomic updates with conflict detection
    const apiPayload = {
      stepData: currentStepData,
      lastUpdated: lastUpdated, // Send for conflict detection
      mergeStrategy: mergeStrategy // 'last-write-wins', 'merge', or 'reject'
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
                  lastUpdated: errorData.serverLastUpdated
                }
              }));
              
              // Retry with merged data
              apiPayload.stepData = mergedData;
              apiPayload.lastUpdated = errorData.serverLastUpdated;
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
              data: currentStepData, // Keep our current data
              lastUpdated: result.lastUpdated
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
              lastUpdated: result.lastUpdated || new Date()
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
      
      setCurrentStep(currentStep + 1);
      // Scroll to top after step change
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
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
      
      setCurrentStep(currentStep - 1);
      // Scroll to top after step change
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
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

    // Debounced auto-save - only save after 5 minutes (300 seconds) of inactivity
    // Significantly reduced frequency to prevent 429 errors and excessive MongoDB calls
    // Users can always use "Save Draft" button for immediate saves
    // IMPORTANT: Capture the data and stepKey at the time of update, not when timeout fires
    // This ensures we save the actual data that was just updated, not stale state
    const stepKeyToSave = actualStepKey;
    const dataToSave = { ...data }; // Create a copy of the data to save
    
    // Clear any existing auto-save timeout to prevent multiple queued saves
    if (window.autoSaveTimeout) {
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = null;
    }
    
    // Prevent too many simultaneous saves by checking if a save is already in progress
    if (window.autoSaveInProgress) {
      // If a save is in progress, just update the data to save and extend the timeout
      window.pendingAutoSaveData = { stepKey: stepKeyToSave, data: dataToSave };
      return;
    }
    
    window.autoSaveTimeout = setTimeout(() => {
      // Check if there's pending data (from rapid typing)
      const saveData = window.pendingAutoSaveData || { stepKey: stepKeyToSave, data: dataToSave };
      window.pendingAutoSaveData = null;
      
      if (Object.keys(saveData.data).length > 0) {
        // Mark that a save is in progress
        window.autoSaveInProgress = true;
        
        // Save the specific step data that was just updated
        saveStepDataDirectly(saveData.stepKey, saveData.data, true)
          .then(() => {
            window.autoSaveInProgress = false;
            console.log('Auto-save completed successfully');
          })
          .catch(error => {
            console.error('Auto-save failed:', error);
            window.autoSaveInProgress = false;
            // If it's a 429 error, wait longer before next save
            if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
              console.warn('Rate limited (429), will wait longer before next auto-save');
              // Clear any pending auto-save and wait 5 minutes
              if (window.autoSaveTimeout) {
                clearTimeout(window.autoSaveTimeout);
                window.autoSaveTimeout = null;
              }
            }
          });
      }
    }, 300000); // Save after 5 minutes (300 seconds) of inactivity - significantly reduced frequency to prevent 429 errors
  };

  const getCurrentStepData = () => {
    const stepKey = getStepKey(currentStep);
    const data = stepData[stepKey]?.data || {};
    
    // Ensure we always return the data, even if it's empty
    return data;
  };

  // Helper function to save step data directly using step-level API (prevents overwrites)
  const saveStepDataDirectly = async (stepKey, stepDataToSave, silent = true, mergeStrategy = 'last-write-wins') => {
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
    
    // Rate limiting: Check if we've made too many requests recently
    const now = Date.now();
    if (!window.saveRequestHistory) {
      window.saveRequestHistory = [];
    }
    
    // Remove requests older than 5 minutes
    window.saveRequestHistory = window.saveRequestHistory.filter(
      timestamp => now - timestamp < 300000 // 5 minutes
    );
    
    // If we've made more than 5 requests in the last 5 minutes, wait a bit
    if (window.saveRequestHistory.length >= 5) {
      const waitTime = 5000; // Wait 5 seconds
      console.warn(`Rate limit protection: Too many saves (${window.saveRequestHistory.length} in last 5 minutes), waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      window.saveRequestHistory = window.saveRequestHistory.filter(
        timestamp => Date.now() - timestamp < 300000
      );
    }
    
    // Record this request
    window.saveRequestHistory.push(now);
    
    // Get the step number from stepKey
    const stepNumberMap = {
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
    const stepNumber = stepNumberMap[stepKey];
    
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
      lastUpdated: lastUpdated, // Send for conflict detection
      mergeStrategy: mergeStrategy // 'last-write-wins', 'merge', or 'reject'
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
                  lastUpdated: errorData.serverLastUpdated
                }
              }));
              
              // Retry with merged data
              apiPayload.stepData = mergedData;
              apiPayload.lastUpdated = errorData.serverLastUpdated;
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
              lastUpdated: result.lastUpdated
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

  // Scroll to top whenever step changes
  useEffect(() => {
    // Scroll to top when step changes - ensures users start at the top of each step
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Also try scrolling the main content area if it exists
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Focus on the first input/textarea if available to help with accessibility
    setTimeout(() => {
      const firstInput = document.querySelector('main input, main textarea');
      if (firstInput && typeof firstInput.focus === 'function') {
        firstInput.focus();
      }
    }, 300);
  }, [currentStep]);

  // Silent periodic auto-save - every 10 minutes to prevent data loss
  // Significantly reduced frequency to avoid overwhelming the server and prevent 429 errors
  // Users have plenty of time to fill out forms and can use "Save Draft" for immediate saves
  useEffect(() => {
    const interval = setInterval(() => {
      // Skip periodic save if a save is already in progress or if debounced save is pending
      if (window.autoSaveInProgress || window.autoSaveTimeout) {
        return; // Skip this cycle to avoid overwhelming the server
      }
      
      const stepKey = getStepKey(currentStep);
      const currentStepData = stepData[stepKey]?.data || {};
      if (Object.keys(currentStepData).length > 0) {
        // Mark that a save is in progress
        window.autoSaveInProgress = true;
        
        // Use direct save function to ensure we save the actual current state
        saveStepDataDirectly(stepKey, currentStepData, true)
          .then(() => {
            window.autoSaveInProgress = false;
            console.log('Periodic auto-save completed');
          })
          .catch(error => {
            // Silently handle errors - don't interrupt user
            console.error('Periodic auto-save failed:', error);
            window.autoSaveInProgress = false;
            
            // If it's a 429 error, extend the interval significantly
            if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
              console.warn('Rate limited (429) during periodic save, extending interval to 10 minutes');
              // Clear the interval and restart with much longer delay
              clearInterval(interval);
              setTimeout(() => {
                // Restart periodic saves after 10 minutes
                const newInterval = setInterval(() => {
                  if (window.autoSaveInProgress || window.autoSaveTimeout) {
                    return;
                  }
                  const stepKey = getStepKey(currentStep);
                  const currentStepData = stepData[stepKey]?.data || {};
                  if (Object.keys(currentStepData).length > 0) {
                    window.autoSaveInProgress = true;
                    saveStepDataDirectly(stepKey, currentStepData, true)
                      .then(() => { window.autoSaveInProgress = false; })
                      .catch(() => { window.autoSaveInProgress = false; });
                  }
                }, 600000); // 10 minutes after rate limit
                return () => clearInterval(newInterval);
              }, 600000);
            }
          });
      }
    }, 600000); // Auto-save every 10 minutes (600,000ms = 10 minutes) - significantly reduced to prevent 429 errors

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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        console.error('Error loading form:', errorMessage, response.status);
        
        // If it's a permission error, redirect to dashboard
        if (response.status === 403 || response.status === 401) {
          alert(`Access denied: ${errorMessage}`);
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
          status: data.form.status || 'draft'
        });
        setCurrentStep(data.form.currentStep || 1);
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
        
        // Load comments if available
        if (data.comments) {
          setComments(data.comments);
        }
      }
    } catch (error) {
      console.error('Error loading form:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Show error to user before redirecting
      alert(`Failed to load form: ${errorMessage}\n\nRedirecting to dashboard...`);
      
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
    
    // Now safe to navigate
    setCurrentStep(stepNumber);
    // Scroll to top immediately when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Scroll to top whenever step changes
  useEffect(() => {
    // Scroll to top when step changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Also try scrolling the main content area if it exists
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  const renderFormStep = () => {
    const currentStepData = getCurrentStepData();
    
    switch (currentStep) {
      case 1:
        return (
          <Step1TableOfContents 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            navigateToStep={navigateToStep}
            allStepData={stepData}
            currentStep={currentStep}
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
            currentStep={currentStep}
          />
        );
      case 3:
        return (
          <Step4StudenttoStudentSexualHarassment 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 4:
        return (
          <Step5RespectForAllPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 5:
        return (
          <Step6SchoolCrisisInterventionPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 6:
        return (
          <Step7SchoolAttendancePlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 7:
        return (
          <Step8StudentsinTemporaryHousingProgramPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 8:
        return (
          <Step9ServiceInSchoolsPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 9:
        return (
          <Step10PlanningInterviews 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 10:
        return (
          <Step11MilitaryRecruitmentOptOut 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 11:
        return (
          <Step12SchoolCulturePlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 12:
        return (
          <Step13AfterSchoolPrograms 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 13:
        return (
          <Step14CellPhonePolicy 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
          />
        );
      case 14:
        return (
          <Step15SchoolCounselingPlan 
            stepData={currentStepData} 
            updateStepData={updateStepData}
            currentStep={currentStep}
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

  // Save Now - saves and redirects to dashboard
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

  // Save Draft - saves and stays on the form
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Clear any pending debounced auto-saves to prevent conflicts
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = null;
      }
      
      // Force immediate save of current step
      const result = await saveCurrentStep(3); // 3 retries for manual saves
      
      if (result.success) {
        const completionStatus = getCompletionStatus();
        // Show a brief success message without redirect
        const saveMessage = `✅ Draft saved successfully!\n\n📊 Progress: ${completionStatus.completed}/${completionStatus.total} steps completed (${completionStatus.percentage}%)\n\n💾 Your work has been saved. You can continue editing.`;
        
        alert(saveMessage);
      } else {
        throw new Error(result.message || 'Save failed');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert(`❌ Failed to save draft: ${error.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // First save the current step
      await saveCurrentStep();
      
      // Reload form data to ensure we have the latest saved data
      await loadFormData();

      // Validate form data before submission
      const validation = validateFormData();
      if (!validation.isValid) {
        // Show validation errors but allow user to proceed if they want
        const errorMessage = `The following steps appear to have no data:\n\n${validation.errors.join('\n')}\n\nWould you like to submit anyway? You can always edit the form later.`;
        const shouldProceed = confirm(errorMessage);
        if (!shouldProceed) {
          setSaving(false);
          return;
        }
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
    // Only check steps that actually exist (principalLetter was removed)
    const stepKeys = [
      'tableOfContents', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ];

    return stepKeys.every(stepKey => stepData[stepKey]?.completed === true);
  };

  // Validate form data before submission
  const validateFormData = () => {
    // Only check steps that actually exist (principalLetter was removed)
    const stepKeys = [
      'tableOfContents', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ];

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
    if (!stepData || !stepData[question.id]) {
      return false;
    }
    
    const value = stepData[question.id];
    
    // For checkboxes, check if it's true
    if (question.type === 'checkbox') {
      return value === true;
    }
    
    // For text/textarea, check if it's not empty
    if (question.type === 'text' || question.type === 'textarea') {
      return typeof value === 'string' && value.trim().length > 0;
    }
    
    // For other types, check if value exists
    return value !== null && value !== undefined && value !== '';
  };

  // Check if all required questions in a step are answered
  const areAllRequiredQuestionsAnswered = (stepKey) => {
    const step = formQuestionsData.steps.find(s => s.key === stepKey);
    if (!step || !step.questions) {
      return false;
    }
    
    const stepInfo = stepData[stepKey];
    if (!stepInfo || !stepInfo.data) {
      return false;
    }
    
    // Get all required questions for this step
    const requiredQuestions = step.questions.filter(q => q.required === true);
    
    // If no required questions, check if step has any data
    if (requiredQuestions.length === 0) {
      return Object.keys(stepInfo.data).length > 0;
    }
    
    // Check if all required questions are answered
    return requiredQuestions.every(question => isQuestionAnswered(question, stepInfo.data));
  };

  // Get detailed completion status for a step
  const getStepCompletionDetails = (stepKey) => {
    const step = formQuestionsData.steps.find(s => s.key === stepKey);
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
    
    const allQuestions = step.questions;
    const requiredQuestions = allQuestions.filter(q => q.required === true);
    const optionalQuestions = allQuestions.filter(q => q.required !== true);
    
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
    const stepKeys = [
      'tableOfContents', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ];

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
      alert('Please enter a comment');
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
      alert('Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(`Failed to add comment: ${error.message}`);
    }
  };

  // Share form with email addresses
  const handleShareForm = async () => {
    if (!shareEmails.trim()) {
      alert('Please enter at least one email address');
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
        alert('Please enter at least one valid email address');
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
      alert(`Form shared successfully with ${emails.length} email address(es)!`);
    } catch (error) {
      console.error('Error sharing form:', error);
      alert(`Failed to share form: ${error.message}`);
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
    if (!confirm(`Remove ${email} from shared list?`)) {
      return;
    }

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
      alert('Email removed from shared list');
    } catch (error) {
      console.error('Error removing shared email:', error);
      alert(`Failed to remove email: ${error.message}`);
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
        alert('Comment marked as fixed!');
      }
    } catch (error) {
      console.error(`Error marking comment as ${action}:`, error);
      alert(`Failed to mark comment: ${error.message}`);
    }
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
    <div className={`min-h-screen ${isPrintView ? 'bg-white' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`bg-white shadow-lg border-b-2 border-sky-200 ${isPrintView ? 'no-print' : ''}`}>
        <div className="max-w-8xl mx-auto px-6">
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
                
                {/* Permission Status Banner */}
                {userPermissions && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-sm ${
                    userPermissions === 'owner' 
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : userPermissions === 'edit'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  }`}>
                    {userPermissions === 'owner' && (
                      <>
                        <Shield className="w-3 h-3" />
                        <span>Owner Access</span>
                      </>
                    )}
                    {userPermissions === 'edit' && (
                      <>
                        <FileText className="w-3 h-3" />
                        <span>Edit Access</span>
                      </>
                    )}
                    {userPermissions === 'view' && (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>View Only - Cannot Edit</span>
                      </>
                    )}
                    {collaborationInfo && collaborationInfo.assignedAt && (
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
            <div className="flex flex-col sm:flex-row gap-3">
              {currentStep !== 1 && (
                <button
                  onClick={() => navigateToStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:from-purple-600 hover:to-purple-700 hover:shadow-lg transform hover:-translate-y-0.5"
                  title="Go to Table of Contents"
                >
                  <BookOpen className="w-4 h-4" />
                  Table of Contents
                </button>
              )}
              <Link
                href={`/view/${formId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:-translate-y-0.5"
                title="View all steps in one page (print-friendly)"
              >
                <FileText className="w-4 h-4" />
                View All Steps
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:from-blue-600 hover:to-sky-700 hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Home className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b-2 border-sky-200 py-6 shadow-md">
        <div className="max-w-8xl mx-auto px-6">
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
          
          {/* Button Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4 mt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 mb-2">Save & Submit Options:</h3>
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-900">💾 Save Draft:</span>
                    <span>Saves your current work and keeps you on the form so you can continue editing. Use this to save your progress without leaving.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-900">💼 Save Now:</span>
                    <span>Saves your current work and redirects you back to the dashboard. Use this when you're done working for now.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-900">📤 Submit for Review:</span>
                    <span>Submits your completed form for administrative review. Only available on the final step. You can still edit after submission if needed.</span>
                  </div>
                </div>
              </div>
            </div>
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
              
              {/* Save Error Indicator */}
              {saveError && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 rounded-lg text-xs shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-red-800 font-medium">{saveError}</span>
                  <button
                    onClick={() => setSaveError(null)}
                    className="ml-2 p-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 transition-all duration-200 hover:scale-110"
                    title="Dismiss error"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {/* Last saved indicator */}
              {lastSaved && !autoSaving && !showSaveReminder && !saveError && (
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
      <main className="max-w-8xl mx-auto px-6 py-8">
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

          {/* Step Comments Section - Show for principals */}
          {session?.user?.level === 4 && getCurrentStepComments().length > 0 && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Review Comments for This Step</h3>
              </div>
              <div className="space-y-3">
                {getCurrentStepComments().map((comment) => (
                  <div key={comment._id} className={`bg-white rounded-lg p-4 border-2 ${
                    comment.isFixed ? 'border-green-300 bg-green-50' : 'border-blue-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-700">
                            {comment.reviewedBy?.name || comment.reviewedByName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.reviewedAt).toLocaleDateString()}
                          </span>
                          {comment.status === 'rejected' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                              Rejected
                            </span>
                          )}
                          {comment.status === 'approved' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                              Approved
                            </span>
                          )}
                          {comment.isFixed && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Fixed
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {!comment.readBy && (
                        <button
                          onClick={() => handleMarkComment(comment._id, 'read')}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Mark as Read
                        </button>
                      )}
                      {comment.readBy && !comment.isFixed && (
                        <button
                          onClick={() => handleMarkComment(comment._id, 'fixed')}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Mark as Fixed
                        </button>
                      )}
                      {comment.readBy && (
                        <span className="text-xs text-gray-500">
                          Read {new Date(comment.readAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Editors Indicator */}
          {activeEditors.length > 0 && (
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">
                      {activeEditors.length} {activeEditors.length === 1 ? 'person' : 'people'} working on this form
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeEditors.map((editor, idx) => {
                        const stepNumber = FORM_STEPS.find(s => getStepKey(s.id) === editor.stepKey)?.id || 0;
                        // Compare userId - need to handle both string and ObjectId formats
                        const editorUserId = typeof editor.userId === 'string' ? editor.userId : editor.userId?.toString();
                        const currentUserId = session?.user?.id || session?.user?._id;
                        const isCurrentUser = editorUserId === currentUserId || editor.email?.toLowerCase() === session?.user?.email?.toLowerCase();
                        return (
                          <div
                            key={idx}
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs ${
                              isCurrentUser
                                ? 'bg-blue-500 text-white font-medium'
                                : 'bg-white border border-blue-300 text-gray-700'
                            }`}
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">{editor.userName || editor.email}</span>
                            <span className="text-gray-500">•</span>
                            <span>Step {stepNumber}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Share and Comment Buttons - Show for Super Admins or authorized email */}
          {(session?.user?.level === 5 || session?.user?.email?.toLowerCase() === 'jjaramillo7@gmail.com') && (
            <div className="mb-6 flex gap-3 flex-wrap">
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <Share2 className="w-4 h-4" />
                Share Form
              </button>
              {session?.user?.level === 5 && (
                <button
                  onClick={() => setShowCommentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment for Step {currentStep}
                </button>
              )}
            </div>
          )}

          {/* Shared Emails List - Show for Super Admins or authorized email */}
          {(session?.user?.level === 5 || session?.user?.email?.toLowerCase() === 'jjaramillo7@gmail.com') && sharedWithEmails.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-900">Shared With:</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {sharedWithEmails.map((share, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 bg-white border border-blue-300 rounded-md px-3 py-1 text-sm"
                  >
                    <span className="text-gray-700">{share.email}</span>
                    <span className="text-xs text-gray-500">({share.permissions})</span>
                    <button
                      onClick={() => handleRemoveSharedEmail(share.email)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                
                {/* Progress Overview - Enhanced with Question-Level Details */}
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
                  
                  {/* Question-Level Progress */}
                  <div className="bg-white rounded-lg p-3 mb-3 border border-gray-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Required Questions Progress:</span>
                      <span className="text-sm font-bold text-blue-600">
                        {getCompletionStatus().questionCompletion.answered}/{getCompletionStatus().questionCompletion.total} answered
                      </span>
                    </div>
                    <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-1000 ease-in-out rounded-full"
                        style={{ width: `${getCompletionStatus().questionCompletion.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {getCompletionStatus().questionCompletion.percentage}% of required questions answered
                    </div>
                  </div>
                  
                  {/* Overall Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Overall Completion:</span>
                      <span className="text-lg font-bold text-green-600">
                        {getCompletionStatus().percentage}%
                      </span>
                    </div>
                    <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500 h-full transition-all duration-1000 ease-in-out rounded-full"
                        style={{ width: `${getCompletionStatus().percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium">
                        Complete Steps: {getCompletionStatus().completed}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                      <span className="text-gray-600 font-medium">
                        Remaining: {getCompletionStatus().total - getCompletionStatus().completed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Steps Status - Detailed Question-Level Completion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {FORM_STEPS.map((step, index) => {
                    const stepKey = getStepKey(step.id);
                    const stepInfo = stepData[stepKey];
                    const completionDetails = getStepCompletionDetails(stepKey);
                    const isCompleted = completionDetails.isComplete;
                    
                    return (
                      <div key={stepKey} className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                        isCompleted 
                          ? 'border-green-300 bg-green-50' 
                          : completionDetails.answeredRequired > 0
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-red-300 bg-red-50'
                      }`}>
                        {/* Status Badge */}
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium text-white mb-3 ${
                          isCompleted ? 'bg-green-500' : completionDetails.answeredRequired > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {isCompleted ? '✓ Complete' : completionDetails.answeredRequired > 0 ? '⚠️ Partial' : '❌ Incomplete'}
                        </div>
                        
                        {/* Step Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                            isCompleted ? 'bg-green-500' : completionDetails.answeredRequired > 0 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <AlertCircle className="w-5 h-5" />
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
                        
                        {/* Step Details - Question-Level Completion */}
                        <div className={`rounded p-3 mb-3 border ${
                          isCompleted 
                            ? 'bg-green-100 border-green-200' 
                            : completionDetails.answeredRequired > 0
                            ? 'bg-yellow-100 border-yellow-200'
                            : 'bg-red-100 border-red-200'
                        }`}>
                          <div className="text-sm mb-2">
                            <span className="font-medium">Required Questions: </span>
                            <span className={isCompleted ? 'text-green-700' : completionDetails.requiredQuestions === 0 ? 'text-gray-600' : 'text-red-700'}>
                              {completionDetails.requiredQuestions === 0 
                                ? 'No required questions (optional step)' 
                                : `${completionDetails.answeredRequired}/${completionDetails.requiredQuestions} answered`}
                            </span>
                          </div>
                          
                          {completionDetails.requiredQuestions > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  isCompleted ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ 
                                  width: `${Math.round((completionDetails.answeredRequired / completionDetails.requiredQuestions) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          )}
                          
                          {completionDetails.requiredQuestions === 0 && (
                            <div className="text-xs text-gray-600 mt-2 italic">
                              This step has no required questions. It will be marked complete once you enter any data.
                            </div>
                          )}
                          
                          {completionDetails.missingRequired.length > 0 && (
                            <div className="text-xs text-red-700 mt-2">
                              <div className="font-semibold mb-1">Missing Required:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {completionDetails.missingRequired.slice(0, 3).map((q, idx) => (
                                  <li key={idx} className="truncate" title={q.title}>
                                    Q{q.number}: {q.title.substring(0, 40)}...
                                  </li>
                                ))}
                                {completionDetails.missingRequired.length > 3 && (
                                  <li className="font-semibold">
                                    +{completionDetails.missingRequired.length - 3} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                          
                          {isCompleted && (
                            <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                              <Clock className="w-3 h-3" />
                              <span>Last updated: {stepInfo?.lastUpdated ? new Date(stepInfo.lastUpdated).toLocaleDateString() : 'Recently'}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        {!isCompleted && (
                          <button
                            onClick={() => navigateToStep(step.id)}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                            title={`Go to Step ${step.id} to complete ${completionDetails.missingRequired.length} required question(s)`}
                          >
                            🎯 Complete Step {step.id} ({completionDetails.missingRequired.length} required missing)
                          </button>
                        )}
                        
                        {isCompleted && (
                          <div className="text-center p-2 bg-green-100 rounded border border-green-200">
                            <span className="text-sm font-medium text-green-700">
                              🎉 All Required Questions Answered!
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Missing Steps/Questions Warning */}
                {(() => {
                  const status = getCompletionStatus();
                  const incompleteSteps = FORM_STEPS.filter((step, index) => {
                    const stepKey = getStepKey(step.id);
                    const details = getStepCompletionDetails(stepKey);
                    return !details.isComplete;
                  });
                  
                  if (incompleteSteps.length > 0 || status.questionCompletion.answered < status.questionCompletion.total) {
                    const totalMissingRequired = FORM_STEPS.reduce((total, step) => {
                      const stepKey = getStepKey(step.id);
                      const details = getStepCompletionDetails(stepKey);
                      return total + details.missingRequired.length;
                    }, 0);
                    
                    return (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xl font-bold text-red-700 mb-1">
                              Incomplete Steps Detected
                            </div>
                            <div className="text-red-600 font-medium">
                              {incompleteSteps.length} step(s) with missing required questions
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-red-200 mb-3">
                          <div className="text-sm text-red-700 mb-2">
                            <strong>Summary:</strong>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                            <li>{incompleteSteps.length} step(s) are not fully completed</li>
                            <li>{totalMissingRequired} required question(s) still need answers</li>
                            <li>{status.questionCompletion.answered}/{status.questionCompletion.total} required questions answered ({status.questionCompletion.percentage}%)</li>
                          </ul>
                        </div>
                        <p className="text-red-600 px-3 py-2 bg-white rounded border border-red-200">
                          <strong>Action Required:</strong> Please answer all required questions before submitting your form. 
                          Use the "Complete Step" buttons above to navigate to and complete the missing required questions. 
                          This ensures your School Plan Form is comprehensive and ready for administrative review.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

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
          <div className={`flex justify-between items-center border-t border-gray-200 pt-6 ${isPrintView ? 'no-print' : ''}`}>
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
              {/* Lock indicator - show if current step is locked by another user */}
              {(() => {
                const stepKey = getStepKey(currentStep);
                const lock = activeLocks[stepKey];
                if (lock && !lock.isCurrentUser) {
                  return (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 rounded-lg text-base text-red-800 shadow-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">
                        Being edited by {lock.lockedBy.userName || lock.lockedBy.email}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
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
                onClick={handleSaveDraft}
                disabled={saving || redirecting}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                  saving || redirecting 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 cursor-pointer'
                }`}
                title="Save your work and continue editing (stays on form)"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Draft'}
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
      {!isPrintView && <ScrollToTop />}

      {/* Share Form Modal */}
      {showShareModal && session?.user?.level === 5 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Share Form</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareEmails('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Addresses
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Enter email addresses separated by commas or new lines
                </p>
                <textarea
                  value={shareEmails}
                  onChange={(e) => setShareEmails(e.target.value)}
                  placeholder="horsford2@schools.nyc.gov, kames4@schools.nyc.gov, cmcleod2@schools.nyc.gov"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <select
                  value={sharePermissions}
                  onChange={(e) => setSharePermissions(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Edit</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {sharePermissions === 'view' 
                    ? 'Users can view the form but cannot make changes'
                    : 'Users can view and edit the form'}
                </p>
              </div>

              {sharedWithEmails.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Currently Shared With:</h4>
                  <div className="space-y-1">
                    {sharedWithEmails.map((share, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        • {share.email} ({share.permissions})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareEmails('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={sharing}
              >
                Cancel
              </button>
              <button
                onClick={handleShareForm}
                disabled={sharing || !shareEmails.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share Form
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal for Super Admins */}
      {showCommentModal && session?.user?.level === 5 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Add Comment for Step {currentStep}: {FORM_STEPS[currentStep - 1]?.title}
              </h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status:
              </label>
              <select
                value={commentStatus}
                onChange={(e) => setCommentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="under_review">Under Review</option>
                <option value="rejected">Rejected</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment:
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter your comment for this step..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComment}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}