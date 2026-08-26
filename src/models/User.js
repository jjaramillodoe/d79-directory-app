const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1,
    description: 'User access level: 1=Viewer, 2=Other Titles, 3=Assistant Principal, 4=Admin Principal, 5=Super Admin'
  },
  schoolName: {
    type: String,
    required: true, // Make school name required for collaboration
    index: true, // Add index for faster school-based queries
  },
  title: {
    type: String,
    default: '',
    description: 'Professional title or role (e.g., Principal, Assistant Principal, Teacher, Staff)'
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Collaboration permissions
  canCollaborate: {
    type: Boolean,
    default: true,
    description: 'Whether user can collaborate on forms'
  },
  collaborationLevel: {
    type: String,
    enum: ['view', 'edit', 'admin'],
    default: 'edit',
    description: 'User\'s collaboration permission level'
  },
  // Assigned forms for collaboration
  assignedForms: [{
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FormSubmission'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'edit'
    },
    assignedSections: [{
      type: String, // Step keys like 'tableOfContents', 'principalLetter', etc.
      description: 'Specific form sections this user can edit'
    }]
  }],
  // Activity tracking
  lastLogin: {
    type: Date,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  activityLog: [{
    action: {
      type: String,
      required: true,
      description: 'Action performed (e.g., "form_edited", "user_created", "login")'
    },
    target: {
      type: String,
      description: 'Target of the action (e.g., form ID, user email)'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String,
      description: 'Additional details about the action'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create compound indexes for better query performance
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ schoolName: 1, isActive: 1 });
UserSchema.index({ schoolName: 1, canCollaborate: 1 });
UserSchema.index({ 'assignedForms.formId': 1 });

// Virtual for getting user's collaboration status
UserSchema.virtual('isCollaborator').get(function() {
  return this.canCollaborate && this.isActive;
});

// Method to add activity log entry
UserSchema.methods.logActivity = function(action, target, details) {
  this.activityLog.push({
    action,
    target,
    details,
    timestamp: new Date()
  });
  this.lastActivity = new Date();
  return this.save();
};

// Method to assign form for collaboration
UserSchema.methods.assignForm = function(formId, assignedBy, permissions, sections) {
  const existingAssignment = this.assignedForms.find(
    assignment => assignment.formId.toString() === formId.toString()
  );
  
  if (existingAssignment) {
    // Update existing assignment
    existingAssignment.permissions = permissions;
    existingAssignment.assignedSections = sections;
    existingAssignment.assignedAt = new Date();
  } else {
    // Create new assignment
    this.assignedForms.push({
      formId,
      assignedBy,
      permissions,
      assignedSections: sections,
      assignedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove form assignment
UserSchema.methods.removeFormAssignment = function(formId) {
  this.assignedForms = this.assignedForms.filter(
    assignment => assignment.formId.toString() !== formId.toString()
  );
  return this.save();
};

// Static method to find users by school
UserSchema.statics.findBySchool = function(schoolName, options = {}) {
  const query = { schoolName, isActive: true };
  
  if (options.includeInactive) {
    delete query.isActive;
  }
  
  if (options.collaboratorsOnly) {
    query.canCollaborate = true;
  }
  
  return this.find(query).sort({ name: 1 });
};

// See the note in AuditLog.js: naming the type collapses the Model union that otherwise makes
// every `User.find(...)` call in the app report "This expression is not callable".
/**
 * @typedef {import('mongoose').Model<any> & {
 *   findBySchool: (schoolName: string, options?: { includeInactive?: boolean }) => Promise<any[]>,
 * }} UserModel
 */

/** @type {UserModel} */
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = UserModel;