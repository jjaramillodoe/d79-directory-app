const mongoose = require('mongoose');

const SchoolYearSettingsSchema = new mongoose.Schema(
  {
    schoolYear: {
      type: String,
      required: true,
      unique: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    questionBankVersion: {
      type: Number,
      default: null,
    },
    deadlines: [
      {
        stepKey: { type: String, required: true },
        label: { type: String, default: '' },
        dueDate: { type: Date },
      },
    ],
    districtGoals: [
      {
        key: { type: String, required: true },
        label: { type: String, default: '' },
        target: { type: String, default: '' },
        unit: { type: String, default: '' },
      },
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// The `mongoose.models.X || mongoose.model(...)` guard keeps Next's dev-time module reloading
// from redefining the model, but it also gives TypeScript a union of two Model types whose call
// signatures it cannot reconcile — every `SchoolYearSettings.find(...)` in the app then reports "This
// expression is not callable". Naming the type collapses the union. Documents stay `any`: the
// schemas are the real contract and generating interfaces from them is a separate job.
/** @type {import('mongoose').Model<any>} */
const SchoolYearSettingsModel =
  mongoose.models.SchoolYearSettings || mongoose.model('SchoolYearSettings', SchoolYearSettingsSchema);

module.exports = SchoolYearSettingsModel;
