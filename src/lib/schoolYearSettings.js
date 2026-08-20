const SchoolYearSettings = require('../models/SchoolYearSettings');
const FormTemplate = require('../models/FormTemplate');
const connectDB = require('./mongodb');
const {
  isValidSchoolYear,
  inferSchoolYear,
  nextSchoolYear,
  latestSchoolYear,
  schoolYearTerm,
  currentSchoolYear,
} = require('./schoolYear');
const {
  cacheGet,
  cacheSet,
  invalidateYearCache,
  invalidateQuestionBankCache,
} = require('./redis');
const { isTableValue, formatTablePlain } = require('./tableAnswer');

const COMPARE_STEPS = [
  { key: 'attendancePlan', label: 'Attendance' },
  { key: 'temporaryHousing', label: 'Temporary housing' },
  { key: 'counselingPlan', label: 'Counseling' },
];

const DEFAULT_GOALS = [
  { key: 'attendance', label: 'Attendance / chronic absenteeism', target: '', unit: '' },
  { key: 'housing', label: 'Students in temporary housing', target: '', unit: '' },
  { key: 'counseling', label: 'School counseling plan', target: '', unit: '' },
];

const REVISIT_PATTERN =
  /\b(date|dates|meeting|meetings|schedule|year|coordinator|liaison|staff|staffing|name|names|contact|goal|goals|target|facilitator|oct|sept|january|deadline)\b/i;

function plainSettings(doc, schoolYear) {
  if (!doc) {
    return {
      schoolYear,
      archived: false,
      archivedAt: null,
      questionBankVersion: null,
      deadlines: [],
      districtGoals: DEFAULT_GOALS,
    };
  }
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    schoolYear: value.schoolYear || schoolYear,
    archived: Boolean(value.archived),
    archivedAt: value.archivedAt || null,
    questionBankVersion: value.questionBankVersion || null,
    deadlines: value.deadlines || [],
    districtGoals: value.districtGoals?.length ? value.districtGoals : DEFAULT_GOALS,
  };
}

async function getYearSettings(schoolYear) {
  if (!isValidSchoolYear(schoolYear)) return plainSettings(null, schoolYear);
  const cacheKey = `year:${schoolYear}`;
  const cached = await cacheGet(cacheKey);
  if (cached?.schoolYear) return cached;
  await connectDB();
  const doc = await SchoolYearSettings.findOne({ schoolYear });
  const settings = plainSettings(doc, schoolYear);
  await cacheSet(cacheKey, settings, 120);
  return settings;
}

async function upsertYearSettings(schoolYear, updates, userId) {
  if (!isValidSchoolYear(schoolYear)) {
    const error = new Error('Enter a school year like 2026-2027');
    error.status = 400;
    throw error;
  }
  await connectDB();
  const next = {
    updatedBy: userId || undefined,
  };
  if (typeof updates.archived === 'boolean') {
    next.archived = updates.archived;
    next.archivedAt = updates.archived ? new Date() : null;
    next.archivedBy = updates.archived ? userId || undefined : null;
  }
  if (updates.questionBankVersion !== undefined) {
    next.questionBankVersion = updates.questionBankVersion
      ? Number(updates.questionBankVersion)
      : null;
  }
  if (Array.isArray(updates.deadlines)) {
    next.deadlines = updates.deadlines
      .filter((item) => item?.stepKey)
      .map((item) => ({
        stepKey: item.stepKey,
        label: item.label || '',
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
      }));
  }
  if (Array.isArray(updates.districtGoals)) {
    next.districtGoals = updates.districtGoals
      .filter((item) => item?.key)
      .map((item) => ({
        key: item.key,
        label: item.label || '',
        target: item.target || '',
        unit: item.unit || '',
      }));
  }

  const doc = await SchoolYearSettings.findOneAndUpdate(
    { schoolYear },
    { $set: next, $setOnInsert: { schoolYear } },
    { new: true, upsert: true }
  );
  await invalidateYearCache(schoolYear);
  if (updates.questionBankVersion !== undefined) {
    await invalidateQuestionBankCache();
  }
  return plainSettings(doc, schoolYear);
}

async function isYearLocked(schoolYear) {
  const settings = await getYearSettings(schoolYear);
  return Boolean(settings.archived);
}

function formAllowsArchivedEdits(form) {
  return Boolean(form?.allowEditsWhenArchived);
}

async function isFormLocked(form) {
  if (!form || formAllowsArchivedEdits(form)) return false;
  return isYearLocked(inferSchoolYear(form));
}

async function archiveSchoolYear(schoolYear, userId) {
  return upsertYearSettings(schoolYear, { archived: true }, userId);
}

function shiftDateByYears(value, years = 1) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCFullYear(date.getUTCFullYear() + Number(years || 0));
  return date;
}

function shiftDeadlinesByYears(deadlines = [], years = 1) {
  return (deadlines || [])
    .filter((item) => item?.stepKey)
    .map((item) => ({
      stepKey: item.stepKey,
      label: item.label || '',
      dueDate: item.dueDate ? shiftDateByYears(item.dueDate, years) : null,
    }));
}

async function listSchoolYears() {
  await connectDB();
  const FormSubmission = require('../models/FormSubmission');
  const [settingsYears, formYears] = await Promise.all([
    SchoolYearSettings.distinct('schoolYear'),
    FormSubmission.distinct('schoolYear'),
  ]);
  return [...new Set([...(settingsYears || []), ...(formYears || []), currentSchoolYear()])]
    .filter(isValidSchoolYear)
    .sort();
}

function serializeDeadline(item) {
  const dueDate = item?.dueDate ? new Date(item.dueDate) : null;
  return {
    stepKey: item.stepKey,
    label: item.label || '',
    dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString() : null,
  };
}

async function previewNextSchoolYear(fromYear) {
  const years = await listSchoolYears();
  const sourceYear = isValidSchoolYear(fromYear) ? fromYear : latestSchoolYear(years);
  const nextYear = nextSchoolYear(sourceYear);
  const source = await getYearSettings(sourceYear);
  const existingDoc = await SchoolYearSettings.findOne({ schoolYear: nextYear }).select('_id').lean();
  const deadlines = shiftDeadlinesByYears(source.deadlines, 1).map(serializeDeadline);
  return {
    years,
    latestYear: latestSchoolYear(years),
    nextYear,
    nextYearExists: Boolean(existingDoc),
    term: schoolYearTerm(nextYear),
    sourceYear,
    carryOver: {
      questionBankVersion: source.questionBankVersion || null,
      districtGoals: source.districtGoals?.length ? source.districtGoals : DEFAULT_GOALS,
      deadlines,
    },
  };
}

async function initializeNextSchoolYear({ fromYear, userId } = {}) {
  const preview = await previewNextSchoolYear(fromYear);
  if (preview.nextYearExists) {
    const error = new Error(`${preview.nextYear} is already set up.`);
    error.status = 409;
    error.existingYear = preview.nextYear;
    throw error;
  }

  await connectDB();
  const source = await getYearSettings(preview.sourceYear);
  try {
    await SchoolYearSettings.create({
      schoolYear: preview.nextYear,
      archived: false,
      archivedAt: null,
      questionBankVersion: preview.carryOver.questionBankVersion,
      deadlines: shiftDeadlinesByYears(source.deadlines, 1),
      districtGoals: preview.carryOver.districtGoals,
      updatedBy: userId || undefined,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = new Error(`${preview.nextYear} is already set up.`);
      duplicate.status = 409;
      duplicate.existingYear = preview.nextYear;
      throw duplicate;
    }
    throw error;
  }

  await invalidateYearCache(preview.nextYear);
  const settings = await getYearSettings(preview.nextYear);
  return {
    ...preview,
    nextYearExists: true,
    settings,
  };
}

async function getYearPlanCounts(schoolYear) {
  if (!isValidSchoolYear(schoolYear)) {
    return { total: 0, draft: 0, unfinished: 0, submitted: 0, liveOverrides: 0 };
  }
  await connectDB();
  const FormSubmission = require('../models/FormSubmission');
  const forms = await FormSubmission.find({})
    .select('schoolYear status createdAt allowEditsWhenArchived')
    .lean();
  const rows = forms.filter((form) => inferSchoolYear(form) === schoolYear);
  const unfinishedStatuses = new Set(['draft', 'rejected']);
  return {
    total: rows.length,
    draft: rows.filter((form) => form.status === 'draft').length,
    unfinished: rows.filter((form) => unfinishedStatuses.has(form.status)).length,
    submitted: rows.filter((form) => !unfinishedStatuses.has(form.status)).length,
    liveOverrides: rows.filter((form) => form.allowEditsWhenArchived).length,
  };
}

function flattenQuestions(steps = []) {
  const map = new Map();
  (steps || []).forEach((step) => {
    (step.questions || []).forEach((question) => {
      if (!question?.id) return;
      map.set(question.id, {
        id: question.id,
        stepKey: step.key,
        stepTitle: step.title,
        title: question.title || '',
        type: question.type || 'textarea',
        required: Boolean(question.required),
        active: question.active !== false,
      });
    });
  });
  return map;
}

function buildNeedsUpdate(sourceSteps, targetSteps) {
  const source = flattenQuestions(sourceSteps);
  const target = flattenQuestions(targetSteps);
  const flags = [];

  target.forEach((question, id) => {
    if (!question.active) return;
    const previous = source.get(id);
    if (!previous) {
      flags.push({
        questionId: id,
        stepKey: question.stepKey,
        reason: 'new',
        label: 'New question this year — please answer.',
      });
      return;
    }
    if (
      previous.title !== question.title ||
      previous.type !== question.type ||
      previous.required !== question.required
    ) {
      flags.push({
        questionId: id,
        stepKey: question.stepKey,
        reason: 'changed',
        label: 'This question changed in the question bank. Review the copied answer.',
      });
      return;
    }
    if (REVISIT_PATTERN.test(question.title)) {
      flags.push({
        questionId: id,
        stepKey: question.stepKey,
        reason: 'revisit',
        label: 'Copied from last year — update names, dates, staffing, or goals.',
      });
    }
  });

  return flags;
}

async function buildNeedsUpdateFromVersions(sourceVersion, targetSteps) {
  await connectDB();
  let sourceSteps = [];
  if (sourceVersion) {
    const source = await FormTemplate.findOne({ version: Number(sourceVersion) }).lean();
    sourceSteps = source?.steps || [];
  }
  return buildNeedsUpdate(sourceSteps, targetSteps);
}

function formatAnswer(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined) return '';
  if (isTableValue(value)) return formatTablePlain(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '';
    }
  }
  return String(value).trim();
}

function compareStepAnswers(previousForm, currentForm, steps) {
  const rows = [];
  (steps || []).forEach((step) => {
    const questions = [...(step.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    questions.forEach((question) => {
      if (question.active === false) return;
      const previousValue = formatAnswer(previousForm?.formData?.[step.key]?.data?.[question.id]);
      const currentValue = formatAnswer(currentForm?.formData?.[step.key]?.data?.[question.id]);
      rows.push({
        stepKey: step.key,
        stepTitle: step.title,
        questionId: question.id,
        questionNumber: question.question_number || '',
        title: question.title,
        previousValue,
        currentValue,
        changed: previousValue !== currentValue,
      });
    });
  });
  return rows;
}

module.exports = {
  COMPARE_STEPS,
  DEFAULT_GOALS,
  getYearSettings,
  upsertYearSettings,
  isYearLocked,
  isFormLocked,
  formAllowsArchivedEdits,
  archiveSchoolYear,
  shiftDeadlinesByYears,
  listSchoolYears,
  previewNextSchoolYear,
  initializeNextSchoolYear,
  getYearPlanCounts,
  buildNeedsUpdate,
  buildNeedsUpdateFromVersions,
  formatAnswer,
  compareStepAnswers,
};
