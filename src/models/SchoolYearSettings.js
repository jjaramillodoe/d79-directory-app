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

module.exports =
  mongoose.models.SchoolYearSettings ||
  mongoose.model('SchoolYearSettings', SchoolYearSettingsSchema);
