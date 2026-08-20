const FormSubmission = require('../models/FormSubmission');
const FormComment = require('../models/FormComment');
const User = require('../models/User');
const { inferSchoolYear, isValidSchoolYear } = require('./schoolYear');
const { getYearSettings } = require('./schoolYearSettings');

function yearMatch(schoolYear) {
  if (!isValidSchoolYear(schoolYear)) return {};
  return { schoolYear };
}

async function findFormsList(match) {
  const rows = await FormSubmission.aggregate([
    { $match: match },
    { $sort: { updatedAt: -1 } },
    {
      $addFields: {
        stepCompletion: {
          $arrayToObject: {
            $map: {
              input: { $objectToArray: { $ifNull: ['$formData', {}] } },
              as: 'step',
              in: {
                k: '$$step.k',
                v: {
                  $or: [
                    { $eq: [{ $ifNull: ['$$step.v.completed', false] }, true] },
                    {
                      $gt: [
                        {
                          $size: {
                            $objectToArray: {
                              $cond: [
                                { $eq: [{ $type: '$$step.v.data' }, 'object'] },
                                '$$step.v.data',
                                {},
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    { $project: { formData: 0 } },
  ]);

  await FormSubmission.populate(rows, [
    { path: 'userId', select: 'name email level' },
    { path: 'reviewedBy', select: 'name email' },
  ]);

  return rows;
}

async function loadCommentsByFormId(formIds) {
  if (!formIds.length) return new Map();
  const comments = await FormComment.find({
    formId: { $in: formIds },
    isActive: true,
  })
    .populate('reviewedBy', 'name email')
    .sort({ reviewedAt: -1 })
    .lean();

  const map = new Map();
  comments.forEach((comment) => {
    const key = String(comment.formId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(comment);
  });
  return map;
}

async function loadLevel3CollaboratorsByFormId(formIds) {
  if (!formIds.length) return new Map();
  const users = await User.find({
    level: 3,
    'assignedForms.formId': { $in: formIds },
  }).select('name email assignedForms').lean();

  const map = new Map();
  users.forEach((person) => {
    (person.assignedForms || []).forEach((assignment) => {
      const key = String(assignment.formId);
      if (!formIds.some((id) => String(id) === key)) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        name: person.name,
        email: person.email,
        permissions: assignment.permissions || 'edit',
      });
    });
  });
  return map;
}

async function decorateFormList(forms, user, { includeCollaborators = false } = {}) {
  const formIds = forms.map((form) => form._id);
  const [commentsByForm, collaboratorsByForm] = await Promise.all([
    loadCommentsByFormId(formIds),
    includeCollaborators ? loadLevel3CollaboratorsByFormId(formIds) : Promise.resolve(new Map()),
  ]);

  const years = Array.from(new Set(forms.map((form) => inferSchoolYear(form))));
  const lockMap = {};
  await Promise.all(years.map(async (year) => {
    lockMap[year] = Boolean((await getYearSettings(year)).archived);
  }));

  return forms.map((form) => {
    const id = String(form._id);
    const comments = commentsByForm.get(id) || [];
    const latestComment = comments[0] || null;
    const collaborators = collaboratorsByForm.get(id) || [];
    const schoolYear = inferSchoolYear(form);
    const assignment = user.assignedForms?.find(
      (item) => String(item.formId) === id
    );
    const formUserId = form.userId?._id?.toString() || form.userId?.toString();
    const isOwner = formUserId === user._id.toString();

    return {
      ...form,
      schoolYear,
      locked: Boolean(lockMap[schoolYear]) && !form.allowEditsWhenArchived,
      yearArchived: Boolean(lockMap[schoolYear]),
      allowEditsWhenArchived: Boolean(form.allowEditsWhenArchived),
      completedSteps: Array.isArray(form.completedSteps) ? form.completedSteps : [],
      comments,
      reviewComments: latestComment?.comment || form.reviewComments,
      reviewedBy: latestComment?.reviewedBy || form.reviewedBy,
      reviewedAt: latestComment?.reviewedAt || form.reviewedAt,
      hasLevel3Collaborators: collaborators.length > 0,
      level3CollaboratorCount: collaborators.length,
      level3Collaborators: collaborators,
      userPermission: isOwner ? 'owner' : user.level === 5 ? 'edit' : assignment?.permissions || null,
      isShared: Boolean(assignment) && !isOwner,
      collaborationPermissions: assignment?.permissions || null,
      assignedSections: assignment?.assignedSections || [],
      assignedAt: assignment?.assignedAt || null,
    };
  });
}

module.exports = {
  yearMatch,
  findFormsList,
  decorateFormList,
};
