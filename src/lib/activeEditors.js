/**
 * Active Editors Tracking Service
 * Tracks which users are currently viewing/editing which steps
 * Uses Redis if available, falls back to in-memory Map
 */

const { getRedis, scanKeys } = require('./redis');

let inMemoryEditors = new Map(); // Fallback: { editorKey: { userId, userName, email, stepKey, stepNumber, lastSeen } }

async function initRedis() {
  return getRedis();
}

/**
 * Generate editor key for a user on a form step
 */
function getEditorKey(formId, userId, stepKey) {
  return `form:${formId}:editor:${userId}:${stepKey}`;
}

/**
 * Register a user as actively editing a step
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} userEmail - User email
 * @param {number} ttlSeconds - Time to live in seconds (default: 60 = 1 minute)
 * @returns {Promise<boolean>}
 */
async function registerActiveEditor(formId, stepKey, userId, userName, userEmail, ttlSeconds = 60) {
  const editorKey = getEditorKey(formId, userId, stepKey);
  const lastSeen = new Date();
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      const editorValue = JSON.stringify({
        userId,
        userName,
        email: userEmail,
        stepKey,
        lastSeen: lastSeen.toISOString(),
      });

      await redisClient.set(editorKey, editorValue, 'EX', ttlSeconds);
      return true;
    }

    // In-memory fallback
    inMemoryEditors.set(editorKey, {
      userId,
      userName,
      email: userEmail,
      stepKey,
      lastSeen,
      expiresAt: new Date(lastSeen.getTime() + ttlSeconds * 1000),
    });

    // Auto-expire after TTL
    setTimeout(() => {
      const currentEditor = inMemoryEditors.get(editorKey);
      if (currentEditor && currentEditor.userId === userId) {
        inMemoryEditors.delete(editorKey);
      }
    }, ttlSeconds * 1000);

    return true;
  } catch (error) {
    console.error('Error registering active editor:', error);
    return false;
  }
}

/**
 * Unregister a user from a step
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function unregisterActiveEditor(formId, stepKey, userId) {
  const editorKey = getEditorKey(formId, userId, stepKey);
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      await redisClient.del(editorKey);
      return true;
    }

    // In-memory fallback
    const existingEditor = inMemoryEditors.get(editorKey);
    if (existingEditor && existingEditor.userId === userId) {
      inMemoryEditors.delete(editorKey);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unregistering active editor:', error);
    return false;
  }
}

/**
 * Get all active editors for a form
 * @param {string} formId - Form ID
 * @returns {Promise<Array>}
 */
async function getActiveEditors(formId) {
  const prefix = `form:${formId}:editor:`;
  const editors = [];
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      const keys = await scanKeys(`${prefix}*`);
      for (const key of keys) {
        const editorData = await redisClient.get(key);
        if (editorData) {
          const editorInfo = JSON.parse(editorData);
          editors.push({
            ...editorInfo,
            lastSeen: new Date(editorInfo.lastSeen),
          });
        }
      }
      return editors;
    }

    // In-memory fallback
    const now = new Date();
    for (const [key, editorInfo] of inMemoryEditors.entries()) {
      if (key.startsWith(prefix)) {
        if (editorInfo.expiresAt >= now) {
          editors.push({
            userId: editorInfo.userId,
            userName: editorInfo.userName,
            email: editorInfo.email,
            stepKey: editorInfo.stepKey,
            lastSeen: editorInfo.lastSeen,
          });
        } else {
          // Clean up expired editor
          inMemoryEditors.delete(key);
        }
      }
    }
    return editors;
  } catch (error) {
    console.error('Error getting active editors:', error);
    return [];
  }
}

/**
 * Get active editors for a specific step
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @returns {Promise<Array>}
 */
async function getStepEditors(formId, stepKey) {
  const allEditors = await getActiveEditors(formId);
  return allEditors.filter(editor => editor.stepKey === stepKey);
}

/**
 * Check if a step has active editors (excluding the current user)
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @param {string} excludeUserId - User ID to exclude from check
 * @returns {Promise<boolean>}
 */
async function hasOtherEditors(formId, stepKey, excludeUserId) {
  const stepEditors = await getStepEditors(formId, stepKey);
  return stepEditors.some(editor => editor.userId !== excludeUserId);
}

/**
 * Clean up expired editors (maintenance function)
 */
async function cleanupExpiredEditors() {
  try {
    const now = new Date();
    for (const [key, editorInfo] of inMemoryEditors.entries()) {
      if (editorInfo.expiresAt < now) {
        inMemoryEditors.delete(key);
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired editors:', error);
  }
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEditors, 60 * 1000);
}

module.exports = {
  registerActiveEditor,
  unregisterActiveEditor,
  getActiveEditors,
  getStepEditors,
  hasOtherEditors,
  cleanupExpiredEditors,
  initRedis,
};

