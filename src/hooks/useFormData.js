'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import * as logger from '../lib/logger';

export default function useFormData({
  formId,
  session,
  router,
  toast,
  bankStepKeysRef,
  currentStepRef,
  setCurrentStep,
}) {
  const formHydratedRef = useRef(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    status: 'draft',
    schoolYear: '',
    createdAt: /** @type {string | undefined} */ (undefined),
    questionBankVersion: /** @type {number | null} */ (null),
  });
  const [collaborationInfo, setCollaborationInfo] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState([]);
  const [formLocked, setFormLocked] = useState(false);
  const [yearArchived, setYearArchived] = useState(false);
  const [allowEditsWhenArchived, setAllowEditsWhenArchived] = useState(false);
  const [formDeadlines, setFormDeadlines] = useState([]);
  const [attestation, setAttestation] = useState(null);
  const [duplicatedFrom, setDuplicatedFrom] = useState(null);
  const [comments, setComments] = useState([]);

  // toast/router/session identities change every render in tests (and toast did in
  // production too). Keep the callback identity on `formId` and read the rest from
  // refs so the page load effect does not refetch in a loop.
  const sessionRef = useRef(session);
  const toastRef = useRef(toast);
  const routerRef = useRef(router);
  useEffect(() => {
    sessionRef.current = session;
    toastRef.current = toast;
    routerRef.current = router;
  }, [session, toast, router]);

  const loadFormData = useCallback(async ({ silent = false } = {}) => {
    const currentSession = sessionRef.current;
    const currentToast = toastRef.current;
    const currentRouter = routerRef.current;

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
        logger.error('Error loading form:', errorMessage, response.status);
        
        // If it's a permission error, redirect to dashboard
        if (response.status === 403 || response.status === 401) {
          currentToast.error(`Access denied: ${errorMessage}`);
          currentRouter.push('/dashboard');
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.form) {
        logger.error('No form data in response:', data);
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
        // Collaboration polling registers the editor once session and formId are set.
        
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
          const currentUserId = currentSession?.user?.id || currentSession?.user?._id;
          const isOwner = formUserId === currentUserId;
          const isSuperAdmin = currentSession?.user?.level === 5;
          const isPrincipal = currentSession?.user?.level === 4;
          const isLevel2 = currentSession?.user?.level === 2;
          const isAssistantPrincipal = currentSession?.user?.level === 3;
          // Level 2 and Level 4 users can edit forms from their school
          const isSameSchool = (isPrincipal || isLevel2) && currentSession?.user?.schoolName && data.form.schoolName && 
                             currentSession.user.schoolName === data.form.schoolName;
          
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
        const stepKeys = bankStepKeysRef.current.length ? bankStepKeysRef.current : [
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
      logger.error('Error loading form:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Show error to user before redirecting
      currentToast.error(`Failed to load form: ${errorMessage}`);
      
      // Redirect back to dashboard after showing error
      setTimeout(() => {
        currentRouter.push('/dashboard');
      }, 1000);
    } finally {
      setLoading(false);
    }
  }, [formId, bankStepKeysRef, currentStepRef, setCurrentStep]);

  return {
    formHydratedRef,
    formData,
    setFormData,
    collaborationInfo,
    setCollaborationInfo,
    userPermissions,
    setUserPermissions,
    stepData,
    setStepData,
    loading,
    setLoading,
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
  };
}
