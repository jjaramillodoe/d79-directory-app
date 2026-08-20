const FormSubmission = require('../models/FormSubmission');
const { getPublishedOrJson } = require('./questionBank');
const { isValidSchoolYear } = require('./schoolYear');
const {
  parseContactsFromText,
  parseContactsAsTable,
  looksLikeContactColumns,
  CONTACT_TABLE_HEADERS,
} = require('./contactTextParser');
const { isTableValue, columnHeaders, normalizeColumnDefs } = require('./tableAnswer');

const DEFAULT_CONTACT_QUESTION_IDS = ['screen4question1', 'screen4question2'];
const REVIEW_LABEL = 'Copied staff list was converted from text into a table. Please review each row.';

function stepAnswers(form, stepKey) {
  return form.formData?.[stepKey]?.data && typeof form.formData[stepKey].data === 'object'
    ? form.formData[stepKey].data
    : null;
}

function needsReview(contacts) {
  if (!contacts.length) return true;
  return contacts.some((contact) => contact.confidence !== 'high' || !contact.name);
}

function flattenQuestions(steps = []) {
  const list = [];
  (steps || []).forEach((step) => {
    (step.questions || []).forEach((question) => {
      if (!question?.id) return;
      list.push({
        id: question.id,
        stepKey: step.key,
        stepTitle: step.title || '',
        title: question.title || question.id,
        type: question.type || 'textarea',
        columns: question.columns || [],
        active: question.active !== false,
      });
    });
  });
  return list;
}

function resolveHeaders(question) {
  const locked = columnHeaders(question?.columns);
  if (locked.length) return locked;
  return CONTACT_TABLE_HEADERS;
}

function countAnswerShapes(forms, stepKey, questionId) {
  let strings = 0;
  let tables = 0;
  forms.forEach((form) => {
    const value = stepAnswers(form, stepKey)?.[questionId];
    if (isTableValue(value)) tables += 1;
    else if (typeof value === 'string' && value.trim()) strings += 1;
  });
  return { strings, tables };
}

function isContactCandidate(question, stringCount) {
  if (!stringCount) return false;
  if (DEFAULT_CONTACT_QUESTION_IDS.includes(question.id)) return true;
  if (question.type === 'table') return true;
  return looksLikeContactColumns(question.columns);
}

async function loadBankQuestions(schoolYear) {
  const bank = await getPublishedOrJson({ schoolYear, preferPublished: true });
  return flattenQuestions(bank?.steps);
}

async function listMigratableQuestions(schoolYear) {
  if (!isValidSchoolYear(schoolYear)) {
    const error = new Error('Enter a school year like 2026-2027');
    error.status = 400;
    throw error;
  }

  const [questions, forms] = await Promise.all([
    loadBankQuestions(schoolYear),
    FormSubmission.find({ schoolYear }).select('formData schoolName status').lean(),
  ]);

  return questions
    .map((question) => {
      const counts = countAnswerShapes(forms, question.stepKey, question.id);
      return {
        ...question,
        stringAnswers: counts.strings,
        alreadyTables: counts.tables,
        recommended: isContactCandidate(question, counts.strings),
        ready: question.type === 'table',
      };
    })
    .filter((question) => question.recommended)
    .sort((a, b) => b.stringAnswers - a.stringAnswers || a.id.localeCompare(b.id));
}

function previewEntry(form, question) {
  const value = stepAnswers(form, question.stepKey)?.[question.id];
  if (isTableValue(value)) return null;
  if (typeof value !== 'string' || !value.trim()) return null;

  const contacts = parseContactsFromText(value);
  const headers = resolveHeaders(question);
  return {
    formId: String(form._id),
    school: form.schoolName || 'Unknown school',
    status: form.status || 'draft',
    sourceChars: value.length,
    sourcePreview: value.replace(/\s+/g, ' ').trim().slice(0, 240),
    rows: contacts.length,
    review: needsReview(contacts),
    contacts: contacts.map((contact) => ({
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      unparsedNotes: contact.unparsedNotes,
      confidence: contact.confidence || 'low',
    })),
    headers,
  };
}

async function previewContactMigration({ schoolYear, questionId }) {
  const questions = await listMigratableQuestions(schoolYear);
  const question = questions.find((item) => item.id === questionId) || (await loadBankQuestions(schoolYear)).find((item) => item.id === questionId);
  if (!question) {
    const error = new Error('That question was not found in the question bank for this year.');
    error.status = 404;
    throw error;
  }

  const forms = await FormSubmission.find({ schoolYear }).select('formData schoolName status').lean();
  const items = forms.map((form) => previewEntry(form, question)).filter(Boolean);

  return {
    schoolYear,
    question: {
      id: question.id,
      stepKey: question.stepKey,
      stepTitle: question.stepTitle,
      title: question.title,
      type: question.type,
      headers: resolveHeaders(question),
    },
    matched: items.length,
    needingReview: items.filter((item) => item.review).length,
    items,
  };
}

async function applyContactMigration({ schoolYear, questionId, formIds }) {
  const selected = new Set((formIds || []).map(String).filter(Boolean));
  if (!selected.size) {
    const error = new Error('Select at least one school to convert.');
    error.status = 400;
    throw error;
  }

  const preview = await previewContactMigration({ schoolYear, questionId });
  if (preview.question.type !== 'table') {
    const error = new Error('Set this question to Table in Question bank and publish it before converting answers.');
    error.status = 400;
    throw error;
  }

  const question = preview.question;
  const allowed = preview.items.filter((item) => selected.has(item.formId));
  const updated = [];
  const skipped = [];

  for (const item of allowed) {
    const form = await FormSubmission.findById(item.formId);
    if (!form) {
      skipped.push({ formId: item.formId, school: item.school, error: 'Form not found' });
      continue;
    }
    const data = stepAnswers(form, question.stepKey);
    if (!data) {
      skipped.push({ formId: item.formId, school: item.school, error: 'Section has no answers' });
      continue;
    }
    const value = data[question.id];
    if (isTableValue(value)) {
      skipped.push({ formId: item.formId, school: item.school, error: 'Already a table' });
      continue;
    }
    if (typeof value !== 'string' || !value.trim()) {
      skipped.push({ formId: item.formId, school: item.school, error: 'No text answer to convert' });
      continue;
    }

    const columns = normalizeColumnDefs(question.headers.map((header) => ({ header, type: 'text' })));
    data[question.id] = parseContactsAsTable(value, { columns, headers: question.headers });
    form.markModified('formData');

    if (item.review) {
      const flags = Array.isArray(form.needsUpdate) ? form.needsUpdate : [];
      if (!flags.some((flag) => flag.questionId === question.id && !flag.reviewedAt)) {
        flags.push({
          questionId: question.id,
          stepKey: question.stepKey,
          reason: 'changed',
          label: REVIEW_LABEL,
        });
        form.needsUpdate = flags;
        form.markModified('needsUpdate');
      }
    }
    await form.save();
    updated.push({
      formId: item.formId,
      school: item.school,
      rows: item.rows,
      review: item.review,
    });
  }

  return {
    schoolYear,
    question,
    applied: updated.length,
    skipped,
    needingReview: updated.filter((item) => item.review).length,
    updated,
  };
}

module.exports = {
  DEFAULT_CONTACT_QUESTION_IDS,
  listMigratableQuestions,
  previewContactMigration,
  applyContactMigration,
  needsReview,
};
