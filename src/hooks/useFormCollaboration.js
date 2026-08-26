'use client';

import { useEffect, useState } from 'react';
import * as logger from '../lib/logger';

export default function useFormCollaboration({ formId, session, currentStep, getStepKey }) {
  const [activeLocks, setActiveLocks] = useState({});
  const [currentLockedStep, setCurrentLockedStep] = useState(null);
  const [activeEditors, setActiveEditors] = useState([]);

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
      logger.error('Error fetching active editors:', error);
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
      logger.error('Error registering as active editor:', error);
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
      logger.error('Error fetching locks:', error);
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
        logger.debug('Lock released successfully');
      }
    } catch (error) {
      logger.error('Error releasing lock:', error);
      // Don't throw - this is cleanup, failure is okay
    }
  };

  useEffect(() => {
    if (!formId || !session) return;

    registerAsActiveEditor();
    fetchActiveEditors();

    const editorInterval = setInterval(() => {
      registerAsActiveEditor();
      fetchActiveEditors();
    }, 5000);

    return () => clearInterval(editorInterval);
    // getStepKey is derived from the question bank and changes identity; the step number is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, session, currentStep]);

  useEffect(() => {
    if (currentLockedStep && currentLockedStep.stepKey !== getStepKey(currentStep)) {
      releaseCurrentLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, currentLockedStep]);

  return {
    activeLocks,
    currentLockedStep,
    setCurrentLockedStep,
    activeEditors,
    fetchActiveEditors,
    registerAsActiveEditor,
    fetchActiveLocks,
    releaseCurrentLock,
  };
}
