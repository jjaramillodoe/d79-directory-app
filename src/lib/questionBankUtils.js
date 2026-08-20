const { isTableValue, isTableAnswered } = require('./tableAnswer');

const EDITABLE_FIELDS = [
  'title',
  'placeholder',
  'description',
  'type',
  'required',
  'question_number',
  'active',
  'columns',
];

const ALLOWED_TYPES = ['text', 'textarea', 'checkbox', 'select', 'table'];

function cloneSteps(steps) {
  return JSON.parse(JSON.stringify(steps || [])).map((step) => {
    const cloned = { ...step };
    delete cloned._id;
    cloned.questions = (cloned.questions || []).map((question, index) => {
      const next = { ...question };
      delete next._id;
      if (typeof next.active !== 'boolean') next.active = true;
      if (typeof next.order !== 'number') next.order = index;
      if (typeof next.required !== 'boolean') next.required = false;
      return next;
    });
    return cloned;
  });
}

function normalizeSteps(steps) {
  return cloneSteps(steps);
}

function sortQuestions(questions) {
  return [...(questions || [])].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : 0;
    const orderB = typeof b.order === 'number' ? b.order : 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.question_number || '').localeCompare(String(b.question_number || ''), undefined, {
      numeric: true,
    });
  });
}

function parseColumnList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function hasMeaningfulAnswer(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (isTableValue(value)) return isTableAnswered(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

function visibleQuestions(questions, answers = {}) {
  return sortQuestions(questions).filter((question) => {
    if (question.active !== false) return true;
    return hasMeaningfulAnswer(answers[question.id]);
  });
}

function mergeOrphanAnswers(questions, answers = {}) {
  const knownIds = new Set((questions || []).map((question) => question.id));
  const merged = sortQuestions(questions);
  Object.keys(answers || {}).forEach((id) => {
    if (knownIds.has(id) || !hasMeaningfulAnswer(answers[id])) return;
    merged.push({
      id,
      question_number: '',
      title: id,
      placeholder: '',
      type: typeof answers[id] === 'boolean' ? 'checkbox' : 'textarea',
      required: false,
      description: 'This answer was saved for a question no longer in the published bank. It has not been deleted.',
      active: false,
      orphan: true,
      order: merged.length,
    });
  });
  return merged;
}

function nextQuestionId(step) {
  const existing = new Set((step.questions || []).map((question) => question.id));
  let n = (step.questions || []).length + 1;
  let id = `${step.key}_q${n}`;
  while (existing.has(id)) {
    n += 1;
    id = `${step.key}_q${n}`;
  }
  return id;
}

function nextQuestionNumber(step) {
  const numbers = (step.questions || [])
    .map((question) => parseInt(question.question_number, 10))
    .filter((value) => !Number.isNaN(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return String(max + 1);
}

function slugifyStepKey(title) {
  const words = String(title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());

  if (!words.length) return 'newStep';

  const camel = words
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('')
    .slice(0, 60);

  return /^[a-zA-Z]/.test(camel) ? camel : `step${camel}`;
}

function nextStepKey(steps, title) {
  const existing = new Set((steps || []).map((step) => step.key));
  let key = slugifyStepKey(title);
  let n = 2;
  while (existing.has(key)) {
    key = `${slugifyStepKey(title)}${n}`;
    n += 1;
  }
  return key;
}

function nextStepId(steps) {
  const ids = (steps || []).map((step) => Number(step.id)).filter((value) => !Number.isNaN(value));
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

function sanitizeQuestionUpdates(updates = {}) {
  const sanitized = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(updates, field)) return;
    sanitized[field] = updates[field];
  });
  if (sanitized.type && !ALLOWED_TYPES.includes(sanitized.type)) {
    delete sanitized.type;
  }
  if (typeof sanitized.required === 'string') {
    sanitized.required = sanitized.required === 'true';
  }
  if (typeof sanitized.active === 'string') {
    sanitized.active = sanitized.active === 'true';
  }
  if (typeof sanitized.title === 'string') sanitized.title = sanitized.title.trim();
  if (typeof sanitized.placeholder === 'string') sanitized.placeholder = sanitized.placeholder;
  if (typeof sanitized.description === 'string') sanitized.description = sanitized.description;
  if (typeof sanitized.question_number === 'number') {
    sanitized.question_number = String(sanitized.question_number);
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, 'columns')) {
    sanitized.columns = parseColumnList(sanitized.columns);
  }
  return sanitized;
}

function stepsSignature(steps) {
  const normalized = cloneSteps(steps).map((step) => ({
    id: step.id,
    key: step.key,
    title: step.title,
    questions: sortQuestions(step.questions).map((question) => ({
      id: question.id,
      question_number: question.question_number || '',
      title: question.title || '',
      placeholder: question.placeholder || '',
      type: question.type || 'textarea',
      required: Boolean(question.required),
      description: question.description || '',
      columns: Array.isArray(question.columns) ? question.columns : [],
      active: question.active !== false,
      order: typeof question.order === 'number' ? question.order : 0,
    })),
  }));
  return JSON.stringify(normalized);
}

function hasUnpublishedChanges(draft, published) {
  if (!draft) return false;
  if (!published) return true;
  return stepsSignature(draft.steps) !== stepsSignature(published.steps);
}

function summarizeTemplate(template) {
  if (!template) {
    return {
      version: null,
      status: null,
      totalQuestions: 0,
      requiredQuestions: 0,
      optionalQuestions: 0,
      inactiveQuestions: 0,
    };
  }
  const questions = (template.steps || []).flatMap((step) => step.questions || []);
  return {
    version: template.version,
    status: template.status,
    totalQuestions: questions.length,
    requiredQuestions: questions.filter((question) => question.required).length,
    optionalQuestions: questions.filter((question) => !question.required).length,
    inactiveQuestions: questions.filter((question) => question.active === false).length,
    updatedAt: template.updatedAt,
    publishedAt: template.publishedAt,
  };
}

function toClientTemplate(template) {
  if (!template) return null;
  const plain = typeof template.toObject === 'function' ? template.toObject() : template;
  return {
    _id: plain._id ? String(plain._id) : null,
    version: plain.version,
    status: plain.status,
    schoolYear: plain.schoolYear || '',
    steps: cloneSteps(plain.steps),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    publishedAt: plain.publishedAt,
    source: plain.source,
  };
}

module.exports = {
  ALLOWED_TYPES,
  EDITABLE_FIELDS,
  cloneSteps,
  normalizeSteps,
  sortQuestions,
  hasMeaningfulAnswer,
  visibleQuestions,
  mergeOrphanAnswers,
  nextQuestionId,
  nextQuestionNumber,
  slugifyStepKey,
  nextStepKey,
  nextStepId,
  sanitizeQuestionUpdates,
  hasUnpublishedChanges,
  summarizeTemplate,
  toClientTemplate,
};
