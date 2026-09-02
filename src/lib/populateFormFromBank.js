const mongoose = require('mongoose');
const connectDB = require('./mongodb');
const FormTemplate = require('../models/FormTemplate');
const FormSubmission = require('../models/FormSubmission');
const { httpError } = require('./schoolCatalog');
const { getPublishedTemplate } = require('./questionBank');
const {
  cloneSteps,
  sortQuestions,
  hasMeaningfulAnswer,
  hasUnpublishedChanges,
  summarizeTemplate,
} = require('./questionBankUtils');
const { normalizeTable, normalizeColumnDefs } = require('./tableAnswer');
const { buildCompletedSteps } = require('./stepSave');

const LOG_PREFIX = '[populate-form-from-bank]';

function logPopulate(event, details = {}) {
  console.info(LOG_PREFIX, event, details);
}

function parseBankLabel(label) {
  const text = String(label || '').trim();
  const schoolYear = (text.match(/(\d{4}-\d{4})/) || [])[1] || '';
  const versionMatch = text.match(/\bv(\d+)\b/i);
  const version = versionMatch ? Number(versionMatch[1]) : null;
  return {
    schoolYear,
    version: Number.isInteger(version) && version > 0 ? version : null,
  };
}

function defaultAnswerForQuestion(question) {
  const type = String(question?.type || 'textarea');
  if (type === 'checkbox') return false;
  if (type === 'table') {
    return normalizeTable({}, { columns: question.columns });
  }
  return '';
}

function headerKey(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SEED_STAFF = [
  {
    first: 'Jordan',
    last: 'Rivera',
    title: 'Coordinator',
    email: 'jordan.rivera@schools.nyc.gov',
    phone: '718-555-0142',
  },
  {
    first: 'Casey',
    last: 'Chen',
    title: 'Assistant Principal',
    email: 'casey.chen@schools.nyc.gov',
    phone: '718-555-0143',
  },
];

function pickSelectOption(options, matcher) {
  const list = Array.isArray(options) ? options.filter(Boolean) : [];
  if (!list.length) return '';
  const hit = matcher ? list.find((option) => matcher.test(String(option))) : null;
  return hit || list[0];
}

function seedCellForColumn(column, ctx = {}, rowIndex = 0) {
  const key = headerKey(column?.header);
  const person = SEED_STAFF[rowIndex % SEED_STAFF.length];
  const year = ctx.schoolYear || '2026-2027';
  const school = ctx.schoolName || 'School';

  if (column?.type === 'select' && column.options?.length) {
    if (key.includes('certified')) return pickSelectOption(column.options, /^yes$/i);
    if (key.includes('grade')) return pickSelectOption(column.options, /^all$/i);
    if (key.includes('timeline')) return pickSelectOption(column.options, /september to june/i);
    return column.options[0];
  }

  if (key === 'name' || key.includes('first name')) return person.first;
  if (key.includes('last name') || key === 'lastname') return person.last;
  if (key.includes('title') || key.includes('member role')) return person.title;
  if (key.includes('email')) return person.email;
  if (key.includes('phone') || key.includes('telephone')) return person.phone;
  if (key.includes('certified') || key.includes('certfied')) return 'Yes';
  if (key.includes('training date') || key === 'date') return '10/15/2026';
  if (key.includes('start time')) return '8:00 AM';
  if (key.includes('end time')) return '3:00 PM';
  if (key === 'time') return '3:00 PM';
  if (key.includes('room')) return '201';
  if (key.includes('program')) return `${school} advisory`;
  if (key.includes('grade')) return 'All';
  if (key.includes('timeline')) return 'September to June';
  if (key.includes('days')) return 'Mon–Thu';
  if (key.includes('escort') || key.includes('instructor')) return `${person.first} ${person.last}`;
  if (key.includes('attendance committee')) return 'Yes';
  if (key.includes('training')) return "Chancellor's Regulation training";
  if (key.includes('notification')) return 'Email blast and morning PA';
  if (key.includes('personal category') || key.includes('person category')) return 'Staff and families';
  if (key.includes('technique')) return 'Verbal de-escalation';
  if (key.includes('notes')) return `Seeded ${year} response`;
  return `Seeded ${year}`;
}

function seededText(question, ctx = {}) {
  const year = ctx.schoolYear || '2026-2027';
  const school = ctx.schoolName || 'School';
  const principal = ctx.principalName || 'the principal';
  const title = String(question?.title || question?.id || 'question')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  return `SEED ${year} — ${school}: ${title}. ${principal} confirms this ${year} response is in place for students and families.`;
}

function seededAnswerForQuestion(question, ctx = {}) {
  const type = String(question?.type || 'textarea');
  if (type === 'checkbox') return true;
  if (type === 'yesno') return 'yes';
  if (type === 'select') {
    const options = Array.isArray(question?.options) ? question.options : [];
    return pickSelectOption(options) || 'Yes';
  }
  if (type === 'table') {
    const columns = normalizeColumnDefs(question.columns);
    const rows = [0, 1].map((rowIndex) =>
      columns.map((column) => seedCellForColumn(column, ctx, rowIndex))
    );
    return normalizeTable({ headers: columns.map((column) => column.header), rows }, { columns: question.columns });
  }
  if (type === 'text') {
    const title = String(question?.title || '').toLowerCase();
    if (title.includes('how many') || title.includes('total number') || title.includes('participate')) {
      return '24';
    }
    return `SEED ${ctx.schoolYear || '2026-2027'} — ${ctx.schoolName || 'School'}`;
  }
  return seededText(question, ctx);
}

function seededFormDataFromSteps(steps, ctx = {}) {
  const ordered = cloneSteps(steps);
  assertBankSchema(ordered);
  const now = new Date();
  const formData = {};
  ordered.forEach((step) => {
    const data = {};
    sortQuestions(step.questions).forEach((question) => {
      data[question.id] = seededAnswerForQuestion(question, ctx);
    });
    formData[step.key] = {
      completed: true,
      data,
      startedAt: now,
      lastUpdated: now,
      timeSpent: 0,
      revisionCount: 1,
    };
  });
  return formData;
}

function assertBankSchema(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw httpError(409, 'Question bank schema mismatch: the source draft has no steps');
  }

  const stepKeys = new Set();
  const seenQuestionIds = new Set();

  steps.forEach((step, stepIndex) => {
    const key = String(step?.key || '').trim();
    if (!key) {
      throw httpError(409, `Question bank schema mismatch: step ${stepIndex + 1} is missing a key`);
    }
    if (stepKeys.has(key)) {
      throw httpError(409, `Question bank schema mismatch: duplicate step key "${key}"`);
    }
    stepKeys.add(key);

    const questions = sortQuestions(step.questions || []);
    if (!questions.length) {
      throw httpError(409, `Question bank schema mismatch: step "${key}" has no questions`);
    }

    questions.forEach((question, questionIndex) => {
      const id = String(question?.id || '').trim();
      if (!id) {
        throw httpError(
          409,
          `Question bank schema mismatch: step "${key}" question ${questionIndex + 1} is missing an id`
        );
      }
      const scoped = `${key}:${id}`;
      if (seenQuestionIds.has(scoped)) {
        throw httpError(409, `Question bank schema mismatch: duplicate question id "${id}" on "${key}"`);
      }
      seenQuestionIds.add(scoped);
    });
  });
}

function emptyFormDataFromSteps(steps) {
  const ordered = cloneSteps(steps);
  assertBankSchema(ordered);

  const formData = {};
  ordered.forEach((step) => {
    const data = {};
    sortQuestions(step.questions).forEach((question) => {
      data[question.id] = defaultAnswerForQuestion(question);
    });
    formData[step.key] = {
      completed: false,
      data,
      startedAt: null,
      lastUpdated: null,
      timeSpent: 0,
      revisionCount: 0,
    };
  });
  return formData;
}

function collectAnswers(formData) {
  const answers = [];
  Object.entries(formData || {}).forEach(([stepKey, step]) => {
    const data = step?.data && typeof step.data === 'object' && !Array.isArray(step.data) ? step.data : {};
    Object.entries(data).forEach(([questionId, value]) => {
      if (hasMeaningfulAnswer(value)) {
        answers.push({ stepKey, questionId });
      }
    });
  });
  return answers;
}

function formIsEmpty(formData) {
  return collectAnswers(formData).length === 0;
}

function bankSummary(steps) {
  const ordered = cloneSteps(steps || []);
  return {
    stepCount: ordered.length,
    questionCount: ordered.reduce((sum, step) => sum + (step.questions || []).length, 0),
    steps: ordered.map((step, index) => ({
      index,
      id: step.id,
      key: step.key,
      title: step.title,
      questionCount: (step.questions || []).length,
      questionIds: sortQuestions(step.questions).map((question) => question.id),
    })),
  };
}

async function resolveSourceTemplate({
  version = null,
  schoolYear = '',
  label = '',
  requirePublished = true,
} = {}) {
  const parsed = parseBankLabel(label);
  const wantedVersion = Number(version || parsed.version || 0) || null;
  const wantedYear = String(schoolYear || parsed.schoolYear || '').trim();

  await connectDB();
  logPopulate('resolve_source.start', { wantedVersion, wantedYear, label: label || null, requirePublished });

  let requested = null;
  if (wantedVersion) {
    requested = await FormTemplate.findOne({ version: wantedVersion }).lean();
  }

  if (!requested && wantedYear) {
    requested = await FormTemplate.findOne({
      schoolYear: wantedYear,
      status: { $in: requirePublished ? ['published', 'archived'] : ['draft', 'published', 'archived'] },
    })
      .sort({ version: -1 })
      .lean();
  }

  if (!requested && requirePublished) {
    const publishedDoc = await getPublishedTemplate();
    requested = publishedDoc?.toObject ? publishedDoc.toObject() : publishedDoc;
  }

  if (!requested) {
    logPopulate('resolve_source.missing', { wantedVersion, wantedYear, label: label || null });
    throw httpError(404, 'Question bank draft not found');
  }

  let source = requested;
  let resolvedFromDraft = false;

  if (requirePublished && source.status !== 'published') {
    const publishedDoc = await getPublishedTemplate();
    const published = publishedDoc?.toObject ? publishedDoc.toObject() : publishedDoc;
    if (!published?.steps?.length) {
      throw httpError(404, 'No published question bank found');
    }
    resolvedFromDraft = source.status === 'draft';
    const unpublished = hasUnpublishedChanges(source, published);
    logPopulate('resolve_source.draft_to_published', {
      requestedVersion: source.version,
      requestedStatus: source.status,
      publishedVersion: published.version,
      unpublishedChanges: unpublished,
    });
    if (unpublished) {
      throw httpError(
        409,
        `Question bank schema mismatch: v${source.version} is an unpublished draft that differs from last published v${published.version}`
      );
    }
    source = published;
  }

  if (!source.steps?.length) {
    throw httpError(409, 'Question bank schema mismatch: the source draft has no steps');
  }

  logPopulate('resolve_source.ok', {
    requestedVersion: requested.version,
    requestedStatus: requested.status,
    sourceVersion: source.version,
    sourceStatus: source.status,
    sourceYear: source.schoolYear || '',
    resolvedFromDraft,
    summary: summarizeTemplate(source),
  });

  return {
    requested,
    source,
    resolvedFromDraft,
    wantedVersion,
    wantedYear,
  };
}

async function withMongoTransaction(work) {
  await connectDB();
  const dbSession = await mongoose.startSession();
  try {
    dbSession.startTransaction();
    const result = await work(dbSession);
    await dbSession.commitTransaction();
    return result;
  } catch (error) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    throw error;
  } finally {
    dbSession.endSession();
  }
}

function nextFormDataFromBank(steps, { fillAnswers = false, schoolName, schoolYear, principalName } = {}) {
  if (fillAnswers) {
    return seededFormDataFromSteps(steps, { schoolName, schoolYear, principalName });
  }
  return emptyFormDataFromSteps(steps);
}

async function previewFormPopulation({
  formId,
  version = 23,
  schoolYear = '2026-2027',
  label = '2026-2027 Draft v23',
  requirePublished = true,
  fillAnswers = false,
} = {}) {
  if (!formId || !mongoose.Types.ObjectId.isValid(String(formId))) {
    throw httpError(400, 'A valid form id is required');
  }

  await connectDB();
  const form = await FormSubmission.findById(formId).lean();
  if (!form) {
    logPopulate('preview.form_missing', { formId: String(formId) });
    throw httpError(404, `Target form ${formId} was not found`);
  }

  const resolved = await resolveSourceTemplate({ version, schoolYear, label, requirePublished });
  const empty = formIsEmpty(form.formData);
  const existingAnswers = collectAnswers(form.formData);
  const nextFormData = nextFormDataFromBank(resolved.source.steps, {
    fillAnswers,
    schoolName: form.schoolName,
    schoolYear: form.schoolYear || resolved.source.schoolYear || schoolYear,
    principalName: form.principalName,
  });
  const nextAnswers = collectAnswers(nextFormData);

  logPopulate('preview.ok', {
    formId: String(form._id),
    schoolName: form.schoolName,
    empty,
    fillAnswers,
    existingAnswerCount: existingAnswers.length,
    nextAnswerCount: nextAnswers.length,
    currentBankVersion: form.questionBankVersion || null,
    nextBankVersion: resolved.source.version,
    bank: bankSummary(resolved.source.steps),
  });

  return {
    form: {
      id: String(form._id),
      schoolName: form.schoolName,
      schoolYear: form.schoolYear || '',
      status: form.status,
      questionBankVersion: form.questionBankVersion || null,
      empty,
      existingAnswerCount: existingAnswers.length,
    },
    source: {
      requestedVersion: resolved.requested.version,
      requestedStatus: resolved.requested.status,
      version: resolved.source.version,
      status: resolved.source.status,
      schoolYear: resolved.source.schoolYear || '',
      resolvedFromDraft: resolved.resolvedFromDraft,
      summary: summarizeTemplate(resolved.source),
      bank: bankSummary(resolved.source.steps),
    },
    fillAnswers,
    wouldWrite: empty,
    nextQuestionBankVersion: resolved.source.version,
    nextStepKeys: Object.keys(nextFormData),
    nextAnswerCount: nextAnswers.length,
  };
}

async function populateEmptyFormFromBank({
  formId,
  version = 23,
  schoolYear = '2026-2027',
  label = '2026-2027 Draft v23',
  requirePublished = true,
  force = false,
  fillAnswers = false,
  actor = null,
} = {}) {
  if (!formId || !mongoose.Types.ObjectId.isValid(String(formId))) {
    throw httpError(400, 'A valid form id is required');
  }

  logPopulate('apply.start', {
    formId: String(formId),
    version,
    schoolYear,
    label,
    requirePublished,
    force,
    fillAnswers,
    actorEmail: actor?.email || null,
  });

  try {
    const result = await withMongoTransaction(async (dbSession) => {
    const form = await FormSubmission.findById(formId).session(dbSession);
    if (!form) {
      throw httpError(404, `Target form ${formId} was not found`);
    }

    const resolved = await resolveSourceTemplate({ version, schoolYear, label, requirePublished });
    const existingAnswers = collectAnswers(form.formData);
    const empty = existingAnswers.length === 0;

    if (!empty && !force) {
      logPopulate('apply.blocked_not_empty', {
        formId: String(form._id),
        existingAnswerCount: existingAnswers.length,
        sample: existingAnswers.slice(0, 8),
      });
      throw httpError(
        409,
        `Target form ${formId} already has answers. Pass force to overwrite an empty-looking form that still has saved data.`
      );
    }

    const nextFormData = nextFormDataFromBank(resolved.source.steps, {
      fillAnswers,
      schoolName: form.schoolName,
      schoolYear: form.schoolYear || resolved.source.schoolYear || schoolYear,
      principalName: form.principalName,
    });
    const previousVersion = form.questionBankVersion || null;
    const nextAnswers = collectAnswers(nextFormData);

    form.formData = nextFormData;
    form.questionBankVersion = resolved.source.version;
    if (!form.schoolYear && (resolved.source.schoolYear || schoolYear)) {
      form.schoolYear = resolved.source.schoolYear || schoolYear;
    }
    form.currentStep = 1;
    form.completedSteps = fillAnswers ? buildCompletedSteps(nextFormData, resolved.source.steps) : [];
    form.needsUpdate = [];
    form.markModified('formData');
    form.markModified('completedSteps');
    form.updatedAt = new Date();
    await form.save({ session: dbSession });

    return {
      formId: String(form._id),
      schoolName: form.schoolName,
      previousVersion,
      questionBankVersion: resolved.source.version,
      sourceStatus: resolved.source.status,
      requestedVersion: resolved.requested.version,
      resolvedFromDraft: resolved.resolvedFromDraft,
      fillAnswers,
      stepCount: Object.keys(nextFormData).length,
      questionCount: Object.values(nextFormData).reduce(
        (sum, step) => sum + Object.keys(step.data || {}).length,
        0
      ),
      answerCount: nextAnswers.length,
      completedSteps: form.completedSteps,
      stepKeys: Object.keys(nextFormData),
      overwrittenAnswers: force && !empty ? existingAnswers.length : 0,
    };
  });

    logPopulate('apply.ok', result);
    return result;
  } catch (error) {
    logPopulate('apply.failed', {
      formId: String(formId),
      status: error.status || 500,
      message: error.message,
    });
    throw error;
  }
}

module.exports = {
  LOG_PREFIX,
  parseBankLabel,
  defaultAnswerForQuestion,
  seedCellForColumn,
  seededAnswerForQuestion,
  seededFormDataFromSteps,
  assertBankSchema,
  emptyFormDataFromSteps,
  formIsEmpty,
  collectAnswers,
  bankSummary,
  resolveSourceTemplate,
  previewFormPopulation,
  populateEmptyFormFromBank,
};
