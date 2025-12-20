const connectDB = require('../lib/mongodb');
const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Script to diagnose and fix form permission issues for a specific form
 */
const fixFormPermissions = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();

    const formId = process.argv[2] || '6925b1c476a7348549715180';
    
    if (!mongoose.Types.ObjectId.isValid(formId)) {
      console.error('❌ Invalid form ID format');
      process.exit(1);
    }

    console.log(`📋 Checking form: ${formId}\n`);

    const form = await FormSubmission.findById(formId).populate('userId', 'email name level schoolName');
    
    if (!form) {
      console.error('❌ Form not found');
      process.exit(1);
    }

    console.log('📊 Form Details:');
    console.log(`   ID: ${form._id}`);
    console.log(`   School: ${form.schoolName}`);
    console.log(`   Principal Email: ${form.principalEmail}`);
    console.log(`   Principal Name: ${form.principalName}`);
    console.log(`   Status: ${form.status}`);
    console.log(`   Owner ID: ${form.userId?._id || form.userId}`);
    console.log(`   Owner Email: ${form.userId?.email || 'N/A'}`);
    console.log(`   Owner Level: ${form.userId?.level || 'N/A'}`);
    console.log(`   Owner School: ${form.userId?.schoolName || 'N/A'}\n`);

    // Find the principal by email
    const principal = await User.findOne({ email: form.principalEmail });
    
    if (!principal) {
      console.error(`❌ Principal ${form.principalEmail} not found in database`);
      process.exit(1);
    }

    console.log('👤 Principal Details:');
    console.log(`   ID: ${principal._id}`);
    console.log(`   Email: ${principal.email}`);
    console.log(`   Name: ${principal.name}`);
    console.log(`   Level: ${principal.level}`);
    console.log(`   School: ${principal.schoolName}\n`);

    // Check if principal is the owner - handle both populated and unpopulated userId
    const formUserId = form.userId?._id?.toString() || form.userId?.toString() || form.userId.toString();
    const principalId = principal._id.toString();
    const isOwner = formUserId === principalId;
    console.log(`🔍 Permission Check:`);
    console.log(`   Form User ID: ${formUserId}`);
    console.log(`   Principal ID: ${principalId}`);
    console.log(`   Is Owner: ${isOwner ? '✅ Yes' : '❌ No'}`);
    console.log(`   School Match: ${principal.schoolName === form.schoolName ? '✅ Yes' : '❌ No'}`);

    // Check if form is assigned to principal
    const assignment = principal.assignedForms.find(
      a => a.formId.toString() === form._id.toString()
    );
    console.log(`   Has Assignment: ${assignment ? '✅ Yes' : '❌ No'}`);
    if (assignment) {
      console.log(`   Assignment Permissions: ${assignment.permissions}`);
    }

    // Fix issues
    console.log('\n🔧 Fixing Issues...\n');

    let fixed = false;

    // Fix 1: Update form ownership if principal email matches but userId doesn't
    if (!isOwner && form.principalEmail && form.principalEmail.toLowerCase() === principal.email.toLowerCase()) {
      console.log('   🔄 Updating form ownership to match principal...');
      form.userId = principal._id;
      await form.save();
      console.log('   ✅ Form ownership updated');
      fixed = true;
    }

    // Fix 2: Ensure principal has assignment with edit permissions
    if (!assignment) {
      console.log('   🔄 Adding form assignment to principal...');
      principal.assignedForms.push({
        formId: form._id,
        assignedBy: principal._id,
        permissions: 'edit',
        assignedAt: new Date(),
        assignedSections: []
      });
      await principal.save();
      console.log('   ✅ Form assigned to principal with edit permissions');
      fixed = true;
    } else if (assignment.permissions !== 'edit') {
      console.log('   🔄 Updating assignment permissions to edit...');
      assignment.permissions = 'edit';
      await principal.save();
      console.log('   ✅ Assignment permissions updated to edit');
      fixed = true;
    }

    // Fix 3: Ensure school names match
    if (principal.schoolName !== form.schoolName) {
      console.log(`   ⚠️  Warning: School name mismatch`);
      console.log(`      Principal School: ${principal.schoolName}`);
      console.log(`      Form School: ${form.schoolName}`);
      console.log(`   🔄 Updating form school name to match principal...`);
      form.schoolName = principal.schoolName;
      await form.save();
      console.log('   ✅ Form school name updated');
      fixed = true;
    }

    if (!fixed) {
      console.log('   ℹ️  No issues found - form permissions are correct');
    }

    console.log('\n✨ Script completed!');
    console.log('\n📋 Final Status:');
    const updatedForm = await FormSubmission.findById(formId).populate('userId', 'email name level schoolName');
    const updatedPrincipal = await User.findOne({ email: form.principalEmail });
    const updatedAssignment = updatedPrincipal.assignedForms.find(
      a => a.formId.toString() === form._id.toString()
    );
    
    const updatedFormUserId = updatedForm.userId?._id?.toString() || updatedForm.userId?.toString() || updatedForm.userId.toString();
    const finalOwnerMatch = updatedFormUserId === updatedPrincipal._id.toString();
    const finalSchoolMatch = updatedPrincipal.schoolName === updatedForm.schoolName;
    const finalHasEditAssignment = updatedAssignment && updatedAssignment.permissions === 'edit';
    
    console.log(`   Owner Match: ${finalOwnerMatch ? '✅' : '❌'}`);
    if (!finalOwnerMatch) {
      console.log(`      Form Owner ID: ${updatedForm.userId?._id || updatedForm.userId}`);
      console.log(`      Principal ID: ${updatedPrincipal._id}`);
    }
    console.log(`   School Match: ${finalSchoolMatch ? '✅' : '❌'}`);
    console.log(`   Has Edit Assignment: ${finalHasEditAssignment ? '✅' : '❌'}`);
    
    if (finalOwnerMatch && finalSchoolMatch && finalHasEditAssignment) {
      console.log('\n✅ All permissions are correctly configured!');
    } else {
      console.log('\n⚠️  Some permission issues remain. The principal should still be able to edit via principalEmail match.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

// Run the script
fixFormPermissions();

