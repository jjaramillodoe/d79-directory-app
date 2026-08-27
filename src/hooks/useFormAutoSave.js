'use client';

import { useEffect, useState } from 'react';
import * as logger from '../lib/logger';

/** @returns {any} */
function autosaveWindow() {
  return window;
}

export default function useFormAutoSave({
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
}) {
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
      logger.debug(`💾 Using step-level API: /api/forms/${formId}/step/${stepNumber}`, {
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
            logger.debug(`Save failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
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

        // The save is still protected by the revision check, but the "being edited by"
        // indicator cannot be trusted right now, so say so once rather than every save.
        if (result.lockDegraded) {
          notifyLockDegraded();
        }
        
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
          logger.debug(`Network error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
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
  const hasUnsavedChanges = () => {
    const currentStepData = getCurrentStepData();
    return Object.keys(currentStepData).length > 0;
  };
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
    clearTimeout(saveReminderTimeoutRef.current);

    // Show save reminder after 3 minutes of inactivity
    saveReminderTimeoutRef.current = setTimeout(() => {
      setShowSaveReminder(true);
    }, 360000); // 6 minutes

    // Debounced auto-save after 3 seconds of inactivity
    const stepKeyToSave = actualStepKey;
    const dataToSave = { ...data };
    
    const win = autosaveWindow();
    if (win.autoSaveTimeout) {
      clearTimeout(win.autoSaveTimeout);
      win.autoSaveTimeout = null;
    }
    
    if (win.autoSaveInProgress) {
      win.pendingAutoSaveData = { stepKey: stepKeyToSave, data: dataToSave };
      return;
    }

    const flushAutoSave = (saveData) => {
      if (!saveData?.data || Object.keys(saveData.data).length === 0) return;
      win.autoSaveInProgress = true;
      saveStepDataDirectly(saveData.stepKey, saveData.data, true)
        .then(() => {
          win.autoSaveInProgress = false;
          const pending = win.pendingAutoSaveData;
          win.pendingAutoSaveData = null;
          if (pending) {
            win.autoSaveTimeout = setTimeout(() => flushAutoSave(pending), 3000);
          }
        })
        .catch((error) => {
          logger.error('Auto-save failed:', error);
          win.autoSaveInProgress = false;
        });
    };
    
    win.autoSaveTimeout = setTimeout(() => {
      const saveData = win.pendingAutoSaveData || { stepKey: stepKeyToSave, data: dataToSave };
      win.pendingAutoSaveData = null;
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
      logger.error('Unknown step key:', stepKey);
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
              logger.warn('Conflict detected:', errorData);
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
            logger.warn(`Rate limited (429), waiting ${retryAfter} seconds before retry`);
            
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

        if (result.lockDegraded) {
          notifyLockDegraded();
        }
        
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
        logger.error('Auto-save failed:', error);
        // Don't show alert for auto-save failures to avoid interrupting user
      } finally {
        if (!silent) {
          setAutoSaving(false);
        }
      }
    }
  };
  // Backup periodic save in case debounce is skipped while a save is in flight
  useEffect(() => {
    const interval = setInterval(() => {
      const win = autosaveWindow();
      if (win.autoSaveInProgress || win.autoSaveTimeout) {
        return;
      }
      
      const stepKey = getStepKey(currentStep);
      const currentStepData = stepData[stepKey]?.data || {};
      if (Object.keys(currentStepData).length > 0) {
        win.autoSaveInProgress = true;
        saveStepDataDirectly(stepKey, currentStepData, true)
          .then(() => {
            win.autoSaveInProgress = false;
          })
          .catch(() => {
            win.autoSaveInProgress = false;
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

  return {
    autoSaving,
    lastSaved,
    setLastSaved,
    showSaveReminder,
    setShowSaveReminder,
    saveError,
    setSaveError,
    saveCurrentStep,
    saveStepDataDirectly,
    updateStepData,
    getCurrentStepData,
    autoSave,
    hasUnsavedChanges,
  };
}
