const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');
const { getPublishedOrJson } = require('./questionBank');
const { inferSchoolYear, isValidSchoolYear } = require('./schoolYear');
const { buildNeedsUpdateFromVersions, getYearSettings } = require('./schoolYearSettings');

function cloneFormData(source) {
  const parent =
    source && typeof source.toObject === 'function'
      ? source.toObject({ depopulate: true, flattenMaps: true })
      : source;
  const formData = parent?.formData || parent || {};
  const raw = JSON.parse(JSON.stringify(formData));

  delete raw._id;

  Object.keys(raw).forEach((key) => {
    const step = raw[key];
    if (!step || typeof step !== 'object' || Array.isArray(step)) return;
    delete step._id;
    const answers =
      step.data && typeof step.data === 'object' && !Array.isArray(step.data) ? step.data : {};
    const hasAnswers = Object.keys(answers).length > 0;
    step.data = answers;
    step.completed = Boolean(step.completed) || hasAnswers;
    step.revisionCount = 0;
    step.timeSpent = typeof step.timeSpent === 'number' ? step.timeSpent : 0;
    if (!hasAnswers) {
      step.startedAt = step.startedAt || null;
      step.lastUpdated = step.lastUpdated || null;
    }
  });

  return raw;
}

function deriveCompletedSteps(formData) {
  const stepNumberMap = {
    tableOfContents: 1,
    principalLetter: 2,
    childAbuseIntervention: 3,
    sexualHarassment: 4,
    respectForAll: 5,
    suicidePrevention: 6,
    attendancePlan: 7,
    temporaryHousing: 8,
    serviceInSchools: 9,
    planningInterviews: 10,
    militaryRecruitment: 11,
    schoolCulture: 12,
    afterSchoolPrograms: 13,
    cellPhonePolicy: 14,
    counselingPlan: 15,
  };
  const keys = Object.keys(formData || {});
  const extraKeys = keys.filter((key) => stepNumberMap[key] === undefined);
  return keys
    .filter((key) => {
      const step = formData[key];
      const answers = step?.data && typeof step.data === 'object' ? step.data : {};
      return Boolean(step?.completed) || Object.keys(answers).length > 0;
    })
    .map((key) => (stepNumberMap[key] !== undefined ? stepNumberMap[key] : 15 + extraKeys.indexOf(key) + 1))
    .filter((value) => typeof value === 'number')
    .sort((a, b) => a - b);
}

async function assignOwner(form, owner, assignedBy) {
  if (!Array.isArray(owner.assignedForms)) {
    owner.assignedForms = [];
  }
  const existing = owner.assignedForms?.find(
    (assignment) => assignment.formId.toString() === form._id.toString()
  );
  if (!existing) {
    owner.assignedForms.push({
      formId: form._id,
      assignedBy: assignedBy._id,
      permissions: 'edit',
      assignedAt: new Date(),
      assignedSections: [],
    });
    await owner.save();
    return;
  }
  if (existing.permissions !== 'edit') {
    existing.permissions = 'edit';
    await owner.save();
  }
}

async function duplicateForm({ source, targetSchoolYear, actor, force = false }) {
  if (!isValidSchoolYear(targetSchoolYear)) {
    const error = new Error('Enter a school year like 2026-2027');
    error.status = 400;
    throw error;
  }

  const sourceYear = inferSchoolYear(source);
  if (sourceYear === targetSchoolYear && !force) {
    const error = new Error(`This form is already for ${targetSchoolYear}`);
    error.status = 400;
    throw error;
  }

  const candidates = await FormSubmission.find({ schoolName: source.schoolName }).select('_id schoolYear createdAt');
  const existing = candidates.find(
    (form) => inferSchoolYear(form) === targetSchoolYear && String(form._id) !== String(source._id)
  );

  if (existing && !force) {
    const error = new Error(
      `${source.schoolName} already has a ${targetSchoolYear} form. Open that form, or confirm to create another copy.`
    );
    error.status = 409;
    error.existingFormId = String(existing._id);
    throw error;
  }

  let questionBankVersion = null;
  let needsUpdate = [];
  try {
    const yearSettings = await getYearSettings(targetSchoolYear);
    const targetBank = await getPublishedOrJson({
      schoolYear: targetSchoolYear,
      version: yearSettings.questionBankVersion,
    });
    if (targetBank?.version) questionBankVersion = targetBank.version;
    needsUpdate = await buildNeedsUpdateFromVersions(source.questionBankVersion, targetBank.steps);
  } catch (error) {
    console.warn('Could not stamp question bank version on duplicated form:', error.message);
  }

  const owner = await User.findById(source.userId);
  if (!owner) {
    const error = new Error('Original form owner was not found');
    error.status = 404;
    throw error;
  }

  const cloned = cloneFormData(source);
  const copy = new FormSubmission({
    userId: owner._id,
    schoolName: source.schoolName,
    principalEmail: source.principalEmail,
    principalName: source.principalName,
    status: 'draft',
    currentStep: 1,
    completedSteps: deriveCompletedSteps(cloned),
    formData: cloned,
    schoolYear: targetSchoolYear,
    duplicatedFrom: source._id,
    createdBy: actor._id,
    questionBankVersion,
    needsUpdate,
    attestation: { confirmed: false },
  });

  copy.markModified('formData');
  try {
    await copy.save();
  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error(
        `${source.schoolName} already has a ${targetSchoolYear} form. Open that form instead of creating a second copy.`
      );
      conflict.status = 409;
      const dup = await FormSubmission.findOne({
        schoolName: source.schoolName,
        schoolYear: targetSchoolYear,
      }).select('_id');
      conflict.existingFormId = dup ? String(dup._id) : null;
      throw conflict;
    }
    throw error;
  }
  await assignOwner(copy, owner, actor);

  return {
    form: copy,
    sourceYear,
    targetSchoolYear,
  };
}

async function repairCopiedCompletions(schoolYear) {
  const query = { duplicatedFrom: { $ne: null } };
  if (schoolYear) query.schoolYear = schoolYear;
  const forms = await FormSubmission.find(query);
  let updated = 0;

  for (const form of forms) {
    const cloned = cloneFormData(form);
    let changed = false;
    Object.keys(cloned).forEach((key) => {
      const next = cloned[key];
      const prev = form.formData?.[key];
      if (next?.completed && !prev?.completed) changed = true;
      if (next?.data && Object.keys(next.data).length > 0 && (!prev?.data || Object.keys(prev.data).length === 0)) {
        changed = true;
      }
    });
    if (!changed && (form.completedSteps || []).length > 0) continue;
    form.formData = cloned;
    form.completedSteps = deriveCompletedSteps(cloned);
    form.markModified('formData');
    form.markModified('completedSteps');
    await form.save();
    updated += 1;
  }

  return { matched: forms.length, updated };
}

module.exports = {
  cloneFormData,
  duplicateForm,
  repairCopiedCompletions,
  deriveCompletedSteps,
};
