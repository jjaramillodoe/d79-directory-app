const mongoose = require('mongoose');

const FormCommentSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormSubmission',
    required: true,
    index: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewedByName: {
    type: String,
    required: true,
  },
  reviewedByEmail: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['approved', 'rejected', 'under_review'],
    required: true,
  },
  // Step-specific comment (optional - if null, it's a general form comment)
  stepNumber: {
    type: Number,
    required: false,
    min: 1,
    max: 14,
  },
  stepKey: {
    type: String,
    required: false,
    enum: [
      'tableOfContents', 'childAbuseIntervention',
      'sexualHarassment', 'respectForAll', 'suicidePrevention',
      'attendancePlan', 'temporaryHousing', 'serviceInSchools',
      'planningInterviews', 'militaryRecruitment', 'schoolCulture',
      'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan'
    ],
  },
  reviewedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Track if comment was read by principal
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  readAt: {
    type: Date,
    required: false,
  },
  // Track if the issue has been fixed/addressed
  fixedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  fixedAt: {
    type: Date,
    required: false,
  },
  isFixed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
FormCommentSchema.index({ formId: 1, reviewedAt: -1 });
FormCommentSchema.index({ formId: 1, stepNumber: 1, isActive: 1 });
FormCommentSchema.index({ reviewedBy: 1, reviewedAt: -1 });
FormCommentSchema.index({ isActive: 1 });
FormCommentSchema.index({ isFixed: 1 });

module.exports = mongoose.models.FormComment || mongoose.model('FormComment', FormCommentSchema);

