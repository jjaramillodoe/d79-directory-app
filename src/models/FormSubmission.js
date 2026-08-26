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
    max: 99,
    default: 1,
  },
  completedSteps: {
    type: [Number],
    default: [],
  },
  formData: {
    type: new mongoose.Schema(
      {
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
      { _id: false, strict: false }
    ),
    default: () => ({}),
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
  // Published question bank version used when this form was created.
  // Existing answers stay keyed by question.id and are never rewritten.
  questionBankVersion: {
    type: Number,
    default: null,
  },
  schoolYear: {
    type: String,
    default: '',
  },
  allowEditsWhenArchived: {
    type: Boolean,
    default: false,
  },
  duplicatedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormSubmission',
  },
  needsUpdate: [{
    questionId: { type: String, required: true },
    stepKey: { type: String, default: '' },
    reason: { type: String, enum: ['new', 'changed', 'revisit'], default: 'revisit' },
    label: { type: String, default: '' },
    reviewedAt: { type: Date },
  }],
  attestation: {
    confirmed: { type: Boolean, default: false },
    name: { type: String, default: '' },
    signedAt: { type: Date },
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  // Share form with specific email addresses (for Level 5 users)
  sharedWithEmails: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view',
    },
  }],
});

FormSubmissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  
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

  const rawFormData = typeof this.formData?.toObject === 'function'
    ? this.formData.toObject({ depopulate: true, flattenMaps: true })
    : (this.formData || {});
  const formSteps = Object.keys(rawFormData).filter((key) => key !== '_id' && key !== 'id');
  const extraKeys = formSteps.filter((key) => stepNumberMap[key] === undefined);

  formSteps.forEach((stepKey) => {
    const step = this.formData?.[stepKey];
    if (!step || typeof step !== 'object') return;
    const answers = step.data && typeof step.data === 'object' && !Array.isArray(step.data)
      ? step.data
      : {};
    const answerKeys = typeof answers.toObject === 'function'
      ? Object.keys(answers.toObject())
      : Object.keys(answers);
    if (answerKeys.length > 0) {
      step.completed = true;
    }
  });

  this.completedSteps = formSteps
    .filter((step) => {
      const nested = this.formData?.[step];
      const answers = nested?.data && typeof nested.data === 'object' && !Array.isArray(nested.data)
        ? nested.data
        : {};
      const answerKeys = typeof answers.toObject === 'function'
        ? Object.keys(answers.toObject())
        : Object.keys(answers);
      return Boolean(nested?.completed) || answerKeys.length > 0;
    })
    .map((step) => {
      if (stepNumberMap[step] !== undefined) return stepNumberMap[step];
      return 15 + extraKeys.indexOf(step) + 1;
    })
    .filter((stepNumber) => typeof stepNumber === 'number')
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
FormSubmissionSchema.index(
  { schoolName: 1, schoolYear: 1 },
  {
    unique: true,
    name: 'schoolName_schoolYear_unique',
    partialFilterExpression: { schoolYear: { $type: 'string', $gt: '' } },
  }
);

// The `mongoose.models.X || mongoose.model(...)` guard keeps Next's dev-time module reloading
// from redefining the model, but it also gives TypeScript a union of two Model types whose call
// signatures it cannot reconcile — every `FormSubmission.find(...)` in the app then reports "This
// expression is not callable". Naming the type collapses the union. Documents stay `any`: the
// schemas are the real contract and generating interfaces from them is a separate job.
/** @type {import('mongoose').Model<any>} */
const FormSubmissionModel =
  mongoose.models.FormSubmission || mongoose.model('FormSubmission', FormSubmissionSchema);

module.exports = FormSubmissionModel;