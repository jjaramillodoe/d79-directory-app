const connectDB = require('../lib/mongodb');
const User = require('../models/User');
const FormSubmission = require('../models/FormSubmission');
const {
  DEMO_PRINCIPAL_EMAIL,
  DEMO_AP_EMAIL,
  DEMO_SCHOOL,
} = require('../lib/demoUsers');

async function upsertUser(data) {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    existing.name = data.name;
    existing.level = data.level;
    existing.schoolName = data.schoolName;
    existing.title = data.title;
    existing.isActive = true;
    existing.canCollaborate = true;
    existing.collaborationLevel = data.collaborationLevel || 'edit';
    await existing.save();
    return existing;
  }
  return User.create(data);
}

async function assignSchoolPlans(ap) {
  const forms = await FormSubmission.find({ schoolName: DEMO_SCHOOL }).select('_id schoolYear');
  if (!Array.isArray(ap.assignedForms)) ap.assignedForms = [];

  forms.forEach((form) => {
    const already = ap.assignedForms.some(
      (assignment) => String(assignment.formId) === String(form._id)
    );
    if (already) return;
    ap.assignedForms.push({
      formId: form._id,
      permissions: 'edit',
      assignedSections: [],
      assignedAt: new Date(),
    });
  });

  await ap.save();
  return forms.length;
}

async function main() {
  await connectDB();

  const principal = await upsertUser({
    name: 'Demo Principal',
    email: DEMO_PRINCIPAL_EMAIL,
    level: 4,
    schoolName: DEMO_SCHOOL,
    title: 'Principal (demo)',
    isActive: true,
    canCollaborate: true,
    collaborationLevel: 'admin',
  });

  const ap = await upsertUser({
    name: 'Demo Assistant Principal',
    email: DEMO_AP_EMAIL,
    level: 3,
    schoolName: DEMO_SCHOOL,
    title: 'Assistant Principal (demo)',
    isActive: true,
    canCollaborate: true,
    collaborationLevel: 'edit',
  });

  const assigned = await assignSchoolPlans(ap);

  console.log('Demo users ready:');
  console.log(`  Principal (level 4): ${principal.email} · ${principal.schoolName}`);
  console.log(`  Assistant Principal (level 3): ${ap.email} · ${ap.schoolName}`);
  console.log(`  Assigned ${assigned} ${DEMO_SCHOOL} plan(s) to the level 3 user`);
  console.log('These emails cannot Google-sign-in. Use Preview as from a Super Admin session.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
