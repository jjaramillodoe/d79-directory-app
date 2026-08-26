const AuditLog = require('../models/AuditLog');
const connectDB = require('./mongodb');
const { reportError } = require('./reportError');

/**
 * Create an audit log entry
 * @param {Object} data - Log data
 * @param {string} data.userId - User ID who performed the action
 * @param {string} data.userName - User name
 * @param {string} data.userEmail - User email
 * @param {string} data.action - Action type (e.g., 'user_created', 'form_edited')
 * @param {string} [data.targetType] - Type of target ('user', 'form', 'system', 'other')
 * @param {string} [data.targetId] - ID of the target (e.g., form ID, user ID)
 * @param {string} [data.details] - Additional details about the action
 * @param {Object} [data.metadata] - Additional metadata
 * @param {Object} [data.request] - Express/Next.js request object (for IP and user agent)
 */
async function logAction(data) {
  try {
    await connectDB();

    const {
      userId,
      userName,
      userEmail,
      action,
      targetType = 'other',
      targetId = null,
      details = '',
      metadata = {},
      request = null,
    } = data;

    // Extract IP address and user agent from request if provided
    let ipAddress = null;
    let userAgent = null;

    if (request) {
      // Try to get real IP (considering proxies)
      ipAddress = 
        request.headers['x-forwarded-for']?.split(',')[0] ||
        request.headers['x-real-ip'] ||
        request.headers['cf-connecting-ip'] ||
        request.ip ||
        request.connection?.remoteAddress ||
        null;
      
      userAgent = request.headers['user-agent'] || null;
    }

    // Create the audit log entry
    await AuditLog.createLog({
      userId,
      userName,
      userEmail,
      action,
      targetType,
      targetId,
      details,
      metadata,
      ipAddress,
      userAgent,
    });

    return true;
  } catch (error) {
    // Don't throw errors - logging should never break the main flow
    reportError(error, { module: 'auditLogger', detail: 'Error creating audit log' });
    return false;
  }
}

/**
 * Log user login
 */
async function logLogin(user, request = null) {
  return logAction({
    userId: user._id || user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'login',
    targetType: 'system',
    details: `User logged in`,
    request,
  });
}

/**
 * Log user creation
 */
async function logUserCreated(createdBy, newUser, request = null) {
  return logAction({
    userId: createdBy._id || createdBy.id,
    userName: createdBy.name,
    userEmail: createdBy.email,
    action: 'user_created',
    targetType: 'user',
    targetId: newUser._id || newUser.id,
    details: `Created user: ${newUser.name} (${newUser.email})`,
    metadata: {
      newUserLevel: newUser.level,
      newUserSchool: newUser.schoolName,
    },
    request,
  });
}

/**
 * Log user update
 */
async function logUserUpdated(updatedBy, user, changes, request = null) {
  const changeDetails = Object.entries(changes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return logAction({
    userId: updatedBy._id || updatedBy.id,
    userName: updatedBy.name,
    userEmail: updatedBy.email,
    action: 'user_updated',
    targetType: 'user',
    targetId: user._id || user.id,
    details: `Updated user: ${user.name} (${user.email}) - Changes: ${changeDetails}`,
    metadata: { changes },
    request,
  });
}

/**
 * Log user deletion
 */
async function logUserDeleted(deletedBy, user, request = null) {
  return logAction({
    userId: deletedBy._id || deletedBy.id,
    userName: deletedBy.name,
    userEmail: deletedBy.email,
    action: 'user_deleted',
    targetType: 'user',
    targetId: user._id || user.id,
    details: `Deleted user: ${user.name} (${user.email})`,
    request,
  });
}

/**
 * Log form creation
 */
async function logFormCreated(user, form, request = null) {
  return logAction({
    userId: user._id || user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'form_created',
    targetType: 'form',
    targetId: form._id || form.id,
    details: `Created form for school: ${form.schoolName || 'Unknown'}`,
    metadata: {
      formId: form._id || form.id,
      schoolName: form.schoolName,
    },
    request,
  });
}

/**
 * Log form edit
 */
async function logFormEdited(user, form, step = null, request = null) {
  return logAction({
    userId: user._id || user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'form_edited',
    targetType: 'form',
    targetId: form._id || form.id,
    details: step ? `Edited form step: ${step}` : `Edited form`,
    metadata: {
      formId: form._id || form.id,
      step,
    },
    request,
  });
}

/**
 * Log form submission
 */
async function logFormSubmitted(user, form, request = null) {
  return logAction({
    userId: user._id || user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'form_submitted',
    targetType: 'form',
    targetId: form._id || form.id,
    details: `Submitted form for review`,
    metadata: {
      formId: form._id || form.id,
      schoolName: form.schoolName,
    },
    request,
  });
}

/**
 * Log form sharing
 */
async function logFormShared(sharedBy, form, sharedWith, permissions, request = null) {
  return logAction({
    userId: sharedBy._id || sharedBy.id,
    userName: sharedBy.name,
    userEmail: sharedBy.email,
    action: 'form_shared',
    targetType: 'form',
    targetId: form._id || form.id,
    details: `Shared form with ${sharedWith.name} (${sharedWith.email}) with ${permissions} permissions`,
    metadata: {
      formId: form._id || form.id,
      sharedWithUserId: sharedWith._id || sharedWith.id,
      permissions,
    },
    request,
  });
}

module.exports = {
  logAction,
  logLogin,
  logUserCreated,
  logUserUpdated,
  logUserDeleted,
  logFormCreated,
  logFormEdited,
  logFormSubmitted,
  logFormShared,
};

