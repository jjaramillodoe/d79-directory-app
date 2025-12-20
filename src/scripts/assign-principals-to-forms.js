const connectDB = require('../lib/mongodb');
const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');

/**
 * Script to assign all principals to their forms with 'edit' permissions
 * - Uses principalEmail when available to find the intended owner
 * - Can skip specific principals via SKIP_EMAILS env var (comma separated)
 * - Updates form ownership if needed and guarantees assignedForms access
 */
const assignPrincipalsToForms = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();

    const skipEmails = (process.env.SKIP_EMAILS || 'nabreu8@schools.nyc.gov')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    console.log(`🚫 Skip list: ${skipEmails.join(', ') || 'none'}`);

    console.log('📋 Fetching all forms...');
    const forms = await FormSubmission.find({}).populate('userId', 'email name');
    
    if (forms.length === 0) {
      console.log('ℹ️  No forms found in database.');
      return;
    }

    console.log(`📊 Found ${forms.length} forms to process\n`);

    let updatedAssignments = 0;
    let alreadyAssigned = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];

    for (const form of forms) {
      try {
        const existingOwnerEmail = form.userId?.email?.toLowerCase();
        const targetEmail = (form.principalEmail || existingOwnerEmail || '').toLowerCase();

        if (!targetEmail) {
          console.log(`⚠️  Form ${form._id} has no principal email or owner email, skipping...`);
          errors++;
          continue;
        }

        if (skipEmails.includes(targetEmail)) {
          console.log(`⏭️  Skipping form ${form._id} for ${targetEmail} (skip list)`);
          skipped++;
          continue;
        }

        const principal = await User.findOne({ email: targetEmail });
        if (!principal) {
          console.log(`⚠️  Principal with email ${targetEmail} not found for form ${form._id}, skipping...`);
          errors++;
          continue;
        }

        let formModified = false;
        // Ensure form ownership matches intended principal
        if (!form.userId || form.userId.toString() !== principal._id.toString()) {
          form.userId = principal._id;
          form.principalEmail = principal.email;
          form.principalName = principal.name;
          formModified = true;
        }

        if (formModified) {
          await form.save();
          console.log(`🔄 Updated form ${form._id} ownership to ${principal.email}`);
        }

        // Check if form is already assigned to this principal
        const existingAssignment = principal.assignedForms.find(
          assignment => assignment.formId.toString() === form._id.toString()
        );

        if (existingAssignment) {
          // Update existing assignment to ensure it has 'edit' permissions
          if (existingAssignment.permissions !== 'edit') {
            existingAssignment.permissions = 'edit';
            await principal.save();
            console.log(`✅ Updated permissions to 'edit' for ${principal.email} on form ${form._id}`);
            updatedAssignments++;
          } else {
            console.log(`ℹ️  Form ${form._id} already assigned to ${principal.email} with 'edit' permissions`);
            alreadyAssigned++;
          }
        } else {
          // Add new assignment with 'edit' permissions
          principal.assignedForms.push({
            formId: form._id,
            assignedBy: principal._id, // Default to principal unless overridden later
            permissions: 'edit',
            assignedAt: new Date(),
            assignedSections: [] // Empty array means all sections
          });
          await principal.save();
          console.log(`✅ Assigned form ${form._id} to ${principal.email} with 'edit' permissions`);
          updatedAssignments++;
        }
      } catch (error) {
        console.error(`❌ Error processing form ${form._id}:`, error.message);
        errors++;
        errorDetails.push({
          formId: form._id.toString(),
          error: error.message
        });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated/Assigned: ${updatedAssignments}`);
    console.log(`   ℹ️  Already compliant: ${alreadyAssigned}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      errorDetails.forEach(({ formId, error }) => {
        console.log(`   Form ${formId}: ${error}`);
      });
    }

    console.log('\n✨ Script completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

// Run the script
assignPrincipalsToForms();

