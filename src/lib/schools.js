const connectDB = require('./mongodb');
const School = require('../models/School');
const User = require('../models/User');
const FormSubmission = require('../models/FormSubmission');
const { normalizeSchoolName, schoolNameKey, httpError } = require('./schoolCatalog');

function toClient(school, counts = {}) {
  return {
    id: String(school._id),
    name: school.name,
    dbn: school.dbn || '',
    notes: school.notes || '',
    isActive: school.isActive !== false,
    userCount: counts.users || 0,
    formCount: counts.forms || 0,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
  };
}

async function countBySchoolName() {
  const [users, forms] = await Promise.all([
    User.aggregate([{ $group: { _id: '$schoolName', n: { $sum: 1 } } }]),
    FormSubmission.aggregate([{ $group: { _id: '$schoolName', n: { $sum: 1 } } }]),
  ]);
  const userMap = new Map(users.map((row) => [row._id, row.n]));
  const formMap = new Map(forms.map((row) => [row._id, row.n]));
  return { userMap, formMap };
}

async function knownDisplayNames() {
  const [fromUsers, fromForms, seed] = await Promise.all([
    User.distinct('schoolName'),
    FormSubmission.distinct('schoolName'),
    import('../constants/schools.js').then((mod) => mod.default || mod.SCHOOL_NAMES || []),
  ]);
  return [...new Set([...seed, ...fromUsers, ...fromForms].map(normalizeSchoolName).filter(Boolean))];
}

/**
 * Insert any school name already used on users, plans, or the static district list.
 * Existing catalog rows are left alone (including deactivated ones).
 */
async function ensureKnownSchools() {
  await connectDB();
  const names = await knownDisplayNames();
  if (names.length === 0) return 0;

  let inserted = 0;
  for (const name of names) {
    const nameKey = schoolNameKey(name);
    const result = await School.updateOne(
      { nameKey },
      { $setOnInsert: { name, nameKey, isActive: true, dbn: '', notes: '' } },
      { upsert: true }
    );
    if (result.upsertedCount) inserted += 1;
  }
  return inserted;
}

async function listSchools({ activeOnly = false } = {}) {
  await connectDB();
  await ensureKnownSchools();

  const filter = activeOnly ? { isActive: true } : {};
  const schools = await School.find(filter).sort({ name: 1 }).lean();
  const { userMap, formMap } = await countBySchoolName();

  return schools.map((school) =>
    toClient(school, {
      users: userMap.get(school.name) || 0,
      forms: formMap.get(school.name) || 0,
    })
  );
}

async function createSchool({ name, dbn, notes, createdBy }) {
  await connectDB();
  const displayName = normalizeSchoolName(name);
  if (!displayName) throw httpError(400, 'School name is required');

  const nameKey = schoolNameKey(displayName);
  const existing = await School.findOne({ nameKey }).lean();
  if (existing) {
    throw httpError(409, 'A school with this name already exists');
  }

  const school = await School.create({
    name: displayName,
    nameKey,
    dbn: normalizeSchoolName(dbn),
    notes: String(notes || '').trim(),
    isActive: true,
    createdBy: createdBy || undefined,
  });

  return toClient(school, { users: 0, forms: 0 });
}

async function updateSchool(id, { name, dbn, notes, isActive }) {
  await connectDB();
  const school = await School.findById(id);
  if (!school) throw httpError(404, 'School not found');

  const oldName = school.name;
  const nextName = name !== undefined ? normalizeSchoolName(name) : school.name;
  if (!nextName) throw httpError(400, 'School name is required');

  const nextKey = schoolNameKey(nextName);
  if (nextKey !== school.nameKey) {
    const clash = await School.findOne({ nameKey: nextKey, _id: { $ne: school._id } }).lean();
    if (clash) throw httpError(409, 'A school with this name already exists');
  }

  school.name = nextName;
  school.nameKey = nextKey;
  if (dbn !== undefined) school.dbn = normalizeSchoolName(dbn);
  if (notes !== undefined) school.notes = String(notes).trim();
  if (isActive !== undefined) school.isActive = Boolean(isActive);
  await school.save();

  let renamedUsers = 0;
  let renamedForms = 0;
  if (oldName !== nextName) {
    const users = await User.updateMany({ schoolName: oldName }, { $set: { schoolName: nextName } });
    renamedUsers = users.modifiedCount || 0;
    try {
      const forms = await FormSubmission.updateMany(
        { schoolName: oldName },
        { $set: { schoolName: nextName } }
      );
      renamedForms = forms.modifiedCount || 0;
    } catch (error) {
      if (error?.code === 11000) {
        throw httpError(
          409,
          'Could not rename: a plan already exists for the new school name in the same year.'
        );
      }
      throw error;
    }
  }

  const { userMap, formMap } = await countBySchoolName();
  return {
    school: toClient(school.toObject(), {
      users: userMap.get(school.name) || 0,
      forms: formMap.get(school.name) || 0,
    }),
    renamedUsers,
    renamedForms,
  };
}

async function deleteSchool(id) {
  await connectDB();
  const school = await School.findById(id).lean();
  if (!school) throw httpError(404, 'School not found');

  const [userCount, formCount] = await Promise.all([
    User.countDocuments({ schoolName: school.name }),
    FormSubmission.countDocuments({ schoolName: school.name }),
  ]);

  if (userCount > 0 || formCount > 0) {
    throw httpError(
      409,
      'This school still has users or plans. Deactivate it instead of deleting.'
    );
  }

  await School.deleteOne({ _id: id });
  return { deleted: true, name: school.name };
}

module.exports = {
  toClient,
  ensureKnownSchools,
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
};
