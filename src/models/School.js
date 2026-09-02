const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    dbn: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

/**
 * @typedef {import('mongoose').Model<any>} SchoolModel
 */

/** @type {SchoolModel} */
const SchoolModel = mongoose.models.School || mongoose.model('School', SchoolSchema);

module.exports = SchoolModel;
