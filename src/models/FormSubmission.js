const mongoose = require('mongoose');

const FormSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  schoolName: {
    type: String,
    required: true,
  },
  principalEmail: {
    type: String,
    required: true,
  },
  principalName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
    default: 'draft',
  },
  currentStep: {
    type: Number,
    min: 1,
    max: 15,
    default: 1,
  },
  completedSteps: {
    type: [Number],
    default: [],
  },
  formData: {
    // Step 1: Table of Contents
    tableOfContents: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 2: Principal Letter
    //principalLetter: {
    //  completed: { type: Boolean, default: false },
    //  data: { type: mongoose.Schema.Types.Mixed, default: {} },
    //  startedAt: { type: Date },
    //  lastUpdated: { type: Date },
    //  timeSpent: { type: Number, default: 0 }, // seconds
    //  revisionCount: { type: Number, default: 0 },
    //},
    // Step 2: Child Abuse Prevention Plan
    childAbuseIntervention: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 3: Student to Student Sexual Harassment
    sexualHarassment: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 4: Respect For All Plan
    respectForAll: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 5: School Crisis Intervention Plan
    suicidePrevention: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 6: School Attendance Plan
    attendancePlan: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 7: Students in Temporary Housing Program
    temporaryHousing: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 8: Service In Schools Plan
    serviceInSchools: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 9: Planning Interviews
    planningInterviews: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 10: Military Recruitment Opt-Out
    militaryRecruitment: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 11: School Culture Plan
    schoolCulture: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 12: After School Programs
    afterSchoolPrograms: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 13: Cell Phone Policy
    cellPhonePolicy: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
    // Step 14: School Counseling Plan
    counselingPlan: {
      completed: { type: Boolean, default: false },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      startedAt: { type: Date },
      lastUpdated: { type: Date },
      timeSpent: { type: Number, default: 0 }, // seconds
      revisionCount: { type: Number, default: 0 },
    },
  },
  submittedAt: {
    type: Date,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  reviewComments: {
    type: String,
  },
  // Notification fields
  notificationSent: {
    type: Boolean,
    default: false,
  },
  notificationSentAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Transfer history for ownership changes
  transferHistory: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transferredAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: 'Ownership transfer',
    },
  }],
  // Track who originally created the form (for super admin transfers)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

FormSubmissionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Auto-calculate completed steps and update metadata - use correct step mapping
  const stepNumberMap = {
    'tableOfContents': 1,
    'principalLetter': 2,
    'childAbuseIntervention': 3,
    'sexualHarassment': 4,
    'respectForAll': 5,
    'suicidePrevention': 6,
    'attendancePlan': 7,
    'temporaryHousing': 8,
    'serviceInSchools': 9,
    'planningInterviews': 10,
    'militaryRecruitment': 11,
    'schoolCulture': 12,
    'afterSchoolPrograms': 13,
    'cellPhonePolicy': 14,
    'counselingPlan': 15
  };
  
  const formSteps = Object.keys(this.formData);
  this.completedSteps = formSteps
    .filter(step => this.formData[step]?.completed)
    .map(step => stepNumberMap[step])
    .filter(stepNumber => stepNumber !== undefined)
    .sort((a, b) => a - b);
  
  // Update metadata for steps that have data
  formSteps.forEach(stepKey => {
    const step = this.formData[stepKey];
    if (step && step.data && Object.keys(step.data).length > 0) {
      // Set startedAt if not already set
      if (!step.startedAt) {
        step.startedAt = new Date();
      }
      
      // Update lastUpdated
      step.lastUpdated = new Date();
      
      // Increment revision count if data changed
      if (this.isModified(`formData.${stepKey}.data`)) {
        step.revisionCount = (step.revisionCount || 0) + 1;
      }
    }
  });
  
  next();
});

// Indexes for better query performance
FormSubmissionSchema.index({ userId: 1, status: 1 });
FormSubmissionSchema.index({ principalEmail: 1 });
FormSubmissionSchema.index({ status: 1, createdAt: -1 });
FormSubmissionSchema.index({ notificationSent: 1, reviewedAt: 1 });

module.exports = mongoose.models.FormSubmission || mongoose.model('FormSubmission', FormSubmissionSchema);