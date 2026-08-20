/**
 * Distributed Locking Service
 * Provides step-level locking to prevent concurrent edits
 * Uses Redis if available, falls back to in-memory Map for single-server deployments
 */

const { getRedis, scanKeys } = require('./redis');

let inMemoryLocks = new Map(); // Fallback: { lockKey: { userId, userName, email, lockedAt, expiresAt } }

async function initRedis() {
  return getRedis();
}

/**
 * Generate lock key for a form step
 */
function getLockKey(formId, stepKey) {
  return `form:${formId}:step:${stepKey}`;
}

function sameUser(left, right) {
  return String(left || '') === String(right || '');
}

/**
 * Acquire a lock for a form step
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key (e.g., 'screen1', 'screen2')
 * @param {string} userId - User ID acquiring the lock
 * @param {string} userName - User name
 * @param {string} userEmail - User email
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<{success: boolean, lockedBy?: object, message?: string}>}
 */
async function acquireLock(formId, stepKey, userId, userName, userEmail, ttlSeconds = 300) {
  const lockKey = getLockKey(formId, stepKey);
  const lockedAt = new Date();
  const expiresAt = new Date(lockedAt.getTime() + ttlSeconds * 1000);
  const redisClient = await getRedis();

  try {
    // Try Redis first
    if (redisClient) {
      const lockValue = JSON.stringify({
        userId,
        userName,
        email: userEmail,
        lockedAt: lockedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      // Try to set the lock with NX (only if not exists) and EX (expiration)
      const result = await redisClient.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
      
      if (result === 'OK') {
        return {
          success: true,
          lockedBy: { userId, userName, email: userEmail, lockedAt, expiresAt },
        };
      } else {
        // Lock already exists, get current lock info
        const currentLock = await redisClient.get(lockKey);
        if (currentLock) {
          const lockInfo = JSON.parse(currentLock);
          const lockExpiresAt = new Date(lockInfo.expiresAt);
          
          // Check if lock is expired
          if (lockExpiresAt < new Date()) {
            // Lock expired, try to acquire it
            const newResult = await redisClient.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
            if (newResult === 'OK') {
              return {
                success: true,
                lockedBy: { userId, userName, email: userEmail, lockedAt, expiresAt },
              };
            }
          }
          
          if (sameUser(lockInfo.userId, userId)) {
            lockInfo.expiresAt = expiresAt.toISOString();
            await redisClient.set(lockKey, JSON.stringify({
              ...lockInfo,
              userId,
              userName,
              email: userEmail,
              lockedAt: lockInfo.lockedAt,
              expiresAt: expiresAt.toISOString(),
            }), 'EX', ttlSeconds);
            return {
              success: true,
              lockedBy: { userId, userName, email: userEmail, lockedAt: new Date(lockInfo.lockedAt), expiresAt },
            };
          }

          return {
            success: false,
            lockedBy: {
              userId: lockInfo.userId,
              userName: lockInfo.userName,
              email: lockInfo.email,
              lockedAt: new Date(lockInfo.lockedAt),
              expiresAt: lockExpiresAt,
            },
            message: `This step is currently being edited by ${lockInfo.userName || lockInfo.email}`,
          };
        }
      }
    }

    // Fallback to in-memory locking
    const existingLock = inMemoryLocks.get(lockKey);
    
    if (existingLock) {
      // Check if lock is expired
      if (existingLock.expiresAt < new Date()) {
        // Lock expired, remove it
        inMemoryLocks.delete(lockKey);
      } else {
        // Lock is still valid
        if (sameUser(existingLock.userId, userId)) {
          existingLock.expiresAt = expiresAt;
          existingLock.userName = userName;
          existingLock.email = userEmail;
          inMemoryLocks.set(lockKey, existingLock);
          return { success: true, lockedBy: existingLock };
        }
        return {
          success: false,
          lockedBy: existingLock,
          message: `This step is currently being edited by ${existingLock.userName || existingLock.email}`,
        };
      }
    }

    // Acquire the lock
    const lockInfo = {
      userId,
      userName,
      email: userEmail,
      lockedAt,
      expiresAt,
    };
    
    inMemoryLocks.set(lockKey, lockInfo);
    
    // Auto-expire the lock after TTL
    setTimeout(() => {
      const currentLock = inMemoryLocks.get(lockKey);
      if (currentLock && currentLock.userId === userId) {
        inMemoryLocks.delete(lockKey);
      }
    }, ttlSeconds * 1000);

    return {
      success: true,
      lockedBy: lockInfo,
    };
  } catch (error) {
    console.error('Error acquiring lock:', error);
    // On error, allow the operation (fail open)
    return {
      success: true,
      lockedBy: { userId, userName, email: userEmail, lockedAt, expiresAt },
      warning: 'Lock service unavailable, proceeding without lock',
    };
  }
}

/**
 * Release a lock for a form step
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @param {string} userId - User ID releasing the lock (must match lock owner)
 * @returns {Promise<boolean>}
 */
async function releaseLock(formId, stepKey, userId) {
  const lockKey = getLockKey(formId, stepKey);
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      // Get current lock to verify ownership
      const currentLock = await redisClient.get(lockKey);
      if (currentLock) {
        const lockInfo = JSON.parse(currentLock);
        if (sameUser(lockInfo.userId, userId)) {
          await redisClient.del(lockKey);
          return true;
        }
      }
      return false;
    }

    // In-memory fallback
    const existingLock = inMemoryLocks.get(lockKey);
    if (existingLock && sameUser(existingLock.userId, userId)) {
      inMemoryLocks.delete(lockKey);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error releasing lock:', error);
    return false;
  }
}

/**
 * Extend a lock's TTL (refresh)
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @param {string} userId - User ID (must match lock owner)
 * @param {number} ttlSeconds - New TTL in seconds
 * @returns {Promise<boolean>}
 */
async function refreshLock(formId, stepKey, userId, ttlSeconds = 300) {
  const lockKey = getLockKey(formId, stepKey);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      const currentLock = await redisClient.get(lockKey);
      if (currentLock) {
        const lockInfo = JSON.parse(currentLock);
        if (lockInfo.userId === userId) {
          lockInfo.expiresAt = expiresAt.toISOString();
          await redisClient.set(lockKey, JSON.stringify(lockInfo), 'EX', ttlSeconds);
          return true;
        }
      }
      return false;
    }

    // In-memory fallback
    const existingLock = inMemoryLocks.get(lockKey);
    if (existingLock && existingLock.userId === userId) {
      existingLock.expiresAt = expiresAt;
      inMemoryLocks.set(lockKey, existingLock);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error refreshing lock:', error);
    return false;
  }
}

/**
 * Get current lock information for a form step
 * @param {string} formId - Form ID
 * @param {string} stepKey - Step key
 * @returns {Promise<object|null>}
 */
async function getLockInfo(formId, stepKey) {
  const lockKey = getLockKey(formId, stepKey);
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      const currentLock = await redisClient.get(lockKey);
      if (currentLock) {
        const lockInfo = JSON.parse(currentLock);
        const expiresAt = new Date(lockInfo.expiresAt);
        
        // Check if expired
        if (expiresAt < new Date()) {
          await redisClient.del(lockKey);
          return null;
        }
        
        return {
          ...lockInfo,
          lockedAt: new Date(lockInfo.lockedAt),
          expiresAt,
        };
      }
      return null;
    }

    // In-memory fallback
    const existingLock = inMemoryLocks.get(lockKey);
    if (existingLock) {
      if (existingLock.expiresAt < new Date()) {
        inMemoryLocks.delete(lockKey);
        return null;
      }
      return existingLock;
    }
    return null;
  } catch (error) {
    console.error('Error getting lock info:', error);
    return null;
  }
}

/**
 * Get all active locks for a form
 * @param {string} formId - Form ID
 * @returns {Promise<Array>}
 */
async function getFormLocks(formId) {
  const prefix = `form:${formId}:step:`;
  const locks = [];
  const redisClient = await getRedis();

  try {
    if (redisClient) {
      const keys = await scanKeys(`${prefix}*`);
      for (const key of keys) {
        const lockData = await redisClient.get(key);
        if (lockData) {
          const lockInfo = JSON.parse(lockData);
          const expiresAt = new Date(lockInfo.expiresAt);
          
          if (expiresAt >= new Date()) {
            const stepKey = key.replace(prefix, '');
            locks.push({
              stepKey,
              ...lockInfo,
              lockedAt: new Date(lockInfo.lockedAt),
              expiresAt,
            });
          } else {
            // Clean up expired lock
            await redisClient.del(key);
          }
        }
      }
      return locks;
    }

    // In-memory fallback
    for (const [key, lockInfo] of inMemoryLocks.entries()) {
      if (key.startsWith(prefix)) {
        if (lockInfo.expiresAt >= new Date()) {
          const stepKey = key.replace(prefix, '');
          locks.push({
            stepKey,
            ...lockInfo,
          });
        } else {
          // Clean up expired lock
          inMemoryLocks.delete(key);
        }
      }
    }
    return locks;
  } catch (error) {
    console.error('Error getting form locks:', error);
    return [];
  }
}

/**
 * Clean up expired locks (maintenance function)
 */
async function cleanupExpiredLocks() {
  try {
    // Redis TTL expires locks; only sweep the in-memory fallback.
    const now = new Date();
    for (const [key, lockInfo] of inMemoryLocks.entries()) {
      if (lockInfo.expiresAt < now) {
        inMemoryLocks.delete(key);
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredLocks, 5 * 60 * 1000);
}

module.exports = {
  acquireLock,
  releaseLock,
  refreshLock,
  getLockInfo,
  getFormLocks,
  cleanupExpiredLocks,
  initRedis, // Export for manual initialization if needed
};

