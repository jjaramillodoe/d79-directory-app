#!/usr/bin/env node
/**
 * CLI wrapper for the Super Admin contact-table conversion.
 * Prefer Year setup in the app. Dry run is the default.
 *
 *   node src/scripts/migrate-textarea-contacts.js --year 2026-2027
 *   node src/scripts/migrate-textarea-contacts.js --year 2026-2027 --question screen4question2 --apply
 */

const connectDB = require('../lib/mongodb');
const {
  listMigratableQuestions,
  previewContactMigration,
  applyContactMigration,
} = require('../lib/migrateTextareaContacts');

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

async function main() {
  const year = argValue('--year', '2026-2027');
  const questionId = argValue('--question', '');
  const apply = process.argv.includes('--apply');

  await connectDB();
  const questions = await listMigratableQuestions(year);

  if (!questionId) {
    console.log(JSON.stringify({ year, mode: 'list', questions }, null, 2));
    process.exit(0);
  }

  const preview = await previewContactMigration({ schoolYear: year, questionId });
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          year,
          mode: 'dry-run',
          question: preview.question,
          matched: preview.matched,
          needingReview: preview.needingReview,
          sample: preview.items.slice(0, 15).map((item) => ({
            school: item.school,
            rows: item.rows,
            review: item.review,
            names: item.contacts.map((contact) => contact.name || '(unparsed)').slice(0, 8),
          })),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const result = await applyContactMigration({
    schoolYear: year,
    questionId,
    formIds: preview.items.map((item) => item.formId),
  });
  console.log(JSON.stringify({ year, mode: 'apply', ...result }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
