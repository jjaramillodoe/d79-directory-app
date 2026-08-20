const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
    enum: [
      'login',
      'logout',
      'user_created',
      'user_updated',
      'user_deleted',
      'user_activated',
      'user_deactivated',
      'form_created',
      'form_duplicated',
      'form_attested',
      'form_edited',
      'form_submitted',
      'form_approved',
      'form_rejected',
      'form_shared',
      'form_unshared',
      'form_ownership_transferred',
      'permission_changed',
      'bulk_action',
      'csv_import',
      'export',
      'settings_changed',
      'question_bank_seeded',
      'question_bank_updated',
      'question_bank_published',
      'other'
    ],
  },
  targetType: {
    type: String,
    enum: ['user', 'form', 'system', 'other'],
    default: 'other',
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  details: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Create indexes for efficient querying
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ userEmail: 1, timestamp: -1 });

// Static method to create an audit log entry
AuditLogSchema.statics.createLog = async function(data) {
  const {
    userId,
    userName,
    userEmail,
    action,
    targetType = 'other',
    targetId = null,
    details = '',
    metadata = {},
    ipAddress = null,
    userAgent = null,
  } = data;

  return this.create({
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
    timestamp: new Date(),
  });
};

// Static method to get logs with filters
AuditLogSchema.statics.getLogs = async function(filters = {}) {
  const {
    userId = null,
    userEmail = null,
    action = null,
    targetType = null,
    startDate = null,
    endDate = null,
    limit = 100,
    skip = 0,
  } = filters;

  const query = {};

  if (userId) query.userId = userId;
  if (userEmail) query.userEmail = userEmail;
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email level')
    .lean();
};

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

