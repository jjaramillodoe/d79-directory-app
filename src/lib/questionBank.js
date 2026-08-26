const fs = require('fs');
const path = require('path');
const connectDB = require('./mongodb');
const FormTemplate = require('../models/FormTemplate');
const SchoolYearSettings = require('../models/SchoolYearSettings');
const { reportError } = require('./reportError');
const {
  cloneSteps,
  normalizeSteps,
  toClientTemplate,
  hasUnpublishedChanges,
  summarizeTemplate,
} = require('./questionBankUtils');
const {
  cacheGet,
  cacheSet,
  questionBankCacheKey,
} = require('./redis');

function loadJsonFallback() {
  const possiblePaths = [
    path.join(process.cwd(), 'src', 'data', 'formQuestions.json'),
    path.join(process.cwd(), 'data', 'formQuestions.json'),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        return {
          steps: normalizeSteps(parsed.steps || []),
        };
      }
    } catch (error) {
      reportError(error, { module: 'questionBank', detail: 'Error loading form questions', filePath });
    }
  }

  return { steps: [] };
}

function toBankPayload(template, source = 'mongo') {
  return {
    version: template.version,
    status: template.status,
    schoolYear: template.schoolYear || '',
    steps: cloneSteps(template.steps),
    source,
  };
}

async function getTemplateByVersion(version) {
  if (!version) return null;
  await connectDB();
  return FormTemplate.findOne({ version: Number(version) });
}

async function getPublishedTemplate() {
  await connectDB();
  return FormTemplate.findOne({ status: 'published' }).sort({ version: -1 });
}

async function getDraftTemplate() {
  await connectDB();
  return FormTemplate.findOne({ status: 'draft' }).sort({ version: -1 });
}

async function seedFromJson({ userId = null, force = false } = {}) {
  await connectDB();

  const existingCount = await FormTemplate.countDocuments();
  if (existingCount > 0 && !force) {
    return {
      seeded: false,
      message: 'Question bank already exists',
      published: toClientTemplate(await getPublishedTemplate()),
      draft: toClientTemplate(await getDraftTemplate()),
    };
  }

  const json = loadJsonFallback();
  if (!json.steps.length) {
    throw new Error('Could not load formQuestions.json to seed the question bank');
  }

  const steps = normalizeSteps(json.steps);

  const published = await FormTemplate.create({
    version: 1,
    status: 'published',
    steps,
    source: 'json-seed',
    createdBy: userId || undefined,
    updatedBy: userId || undefined,
    publishedBy: userId || undefined,
    publishedAt: new Date(),
  });

  const draft = await FormTemplate.create({
    version: 2,
    status: 'draft',
    steps: cloneSteps(steps),
    source: 'json-seed',
    createdBy: userId || undefined,
    updatedBy: userId || undefined,
  });

  return {
    seeded: true,
    message: 'Question bank seeded from formQuestions.json',
    published: toClientTemplate(published),
    draft: toClientTemplate(draft),
  };
}

async function ensureSeeded(userId = null) {
  await connectDB();
  const existing = await FormTemplate.countDocuments();
  if (existing === 0) {
    return seedFromJson({ userId });
  }

  const published = await getPublishedTemplate();
  let draft = await getDraftTemplate();

  if (published && !draft) {
    draft = await FormTemplate.create({
      version: published.version + 1,
      status: 'draft',
      steps: cloneSteps(published.steps),
      source: 'published-clone',
      createdBy: userId || undefined,
      updatedBy: userId || undefined,
    });
  }

  return {
    seeded: false,
    published: toClientTemplate(published),
    draft: toClientTemplate(draft),
  };
}

async function getAdminQuestionBank() {
  const seeded = await ensureSeeded();
  const published = seeded.published || toClientTemplate(await getPublishedTemplate());
  const draft = seeded.draft || toClientTemplate(await getDraftTemplate());

  return {
    published,
    draft,
    hasUnpublishedChanges: hasUnpublishedChanges(draft, published),
    publishedSummary: summarizeTemplate(published),
    draftSummary: summarizeTemplate(draft),
    seeded: Boolean(seeded.seeded),
  };
}

async function getPublishedOrJson({ schoolYear, version, preferPublished = false } = {}) {
  const cacheKey = questionBankCacheKey({ schoolYear, version, preferPublished });
  const cached = await cacheGet(cacheKey);
  if (cached?.steps) return cached;

  let payload = null;
  try {
    await connectDB();
    if (version && !preferPublished) {
      const pinned = await getTemplateByVersion(version);
      if (pinned?.steps?.length) payload = toBankPayload(pinned);
    }
    if (!payload && schoolYear) {
      const settings = await SchoolYearSettings.findOne({ schoolYear }).lean();
      if (settings?.questionBankVersion) {
        const yearPinned = await getTemplateByVersion(settings.questionBankVersion);
        if (yearPinned?.steps?.length) payload = toBankPayload(yearPinned);
      }
      if (!payload) {
        const byYear = await FormTemplate.findOne({
          schoolYear,
          status: { $in: ['published', 'archived'] },
        }).sort({ version: -1 });
        if (byYear?.steps?.length) payload = toBankPayload(byYear);
      }
    }
    if (!payload) {
      const published = await getPublishedTemplate();
      if (published?.steps?.length) payload = toBankPayload(published);
    }
  } catch (error) {
    console.warn('Could not load published question bank from Mongo, using JSON fallback:', error.message);
  }

  if (!payload) {
    const json = loadJsonFallback();
    payload = {
      version: null,
      status: 'json-fallback',
      schoolYear: '',
      steps: json.steps,
      source: 'json',
    };
  }

  await cacheSet(cacheKey, payload, 300);
  return payload;
}

function auditRequest(request) {
  return {
    headers: Object.fromEntries(request.headers || []),
    ip: null,
    connection: { remoteAddress: null },
  };
}

module.exports = {
  loadJsonFallback,
  getPublishedTemplate,
  getTemplateByVersion,
  getDraftTemplate,
  seedFromJson,
  ensureSeeded,
  getAdminQuestionBank,
  getPublishedOrJson,
  auditRequest,
};
