const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question_number: { type: String, default: '' },
    title: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    type: { type: String, default: 'textarea' },
    required: { type: Boolean, default: false },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    columns: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { _id: false, strict: false }
);

const StepSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    key: { type: String, required: true },
    title: { type: String, required: true },
    intro: { type: String, default: '' },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false, strict: false }
);

const FormTemplateSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      required: true,
      index: true,
    },
    schoolYear: { type: String, default: '' },
    steps: { type: [StepSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    source: { type: String, default: 'json-seed' },
  },
  { timestamps: true }
);

FormTemplateSchema.index({ status: 1, version: -1 });
FormTemplateSchema.index({ version: 1 }, { unique: true });

// The `mongoose.models.X || mongoose.model(...)` guard keeps Next's dev-time module reloading
// from redefining the model, but it also gives TypeScript a union of two Model types whose call
// signatures it cannot reconcile — every `FormTemplate.find(...)` in the app then reports "This
// expression is not callable". Naming the type collapses the union. Documents stay `any`: the
// schemas are the real contract and generating interfaces from them is a separate job.
/** @type {import('mongoose').Model<any>} */
const FormTemplateModel =
  mongoose.models.FormTemplate || mongoose.model('FormTemplate', FormTemplateSchema);

module.exports = FormTemplateModel;
