#!/usr/bin/env node
/**
 * CLI wrapper for the Super Admin contact-table conversion.
 * Prefer Year setup in the app. Dry run is the default and writes migration_diff.json.
 *
 *   node src/scripts/migrate-textarea-contacts.js --year 2026-2027
 *   node src/scripts/migrate-textarea-contacts.js --year 2026-2027 --question screen4question2
 *   node src/scripts/migrate-textarea-contacts.js --year 2026-2027 --question screen4question2 --out migration_diff.json
 *   node src/scripts/migrate-textarea-contacts.js --year 2026-2027 --question screen4question2 --apply
 */

const fs = require('fs');
const path = require('path');
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
  const outFile = argValue('--out', 'migration_diff.json');
  const apply = process.argv.includes('--apply');

  await connectDB();
  const questions = await listMigratableQuestions(year);

  if (!questionId) {
    console.log(JSON.stringify({ year, mode: 'list', questions }, null, 2));
    process.exit(0);
  }

  const preview = await previewContactMigration({ schoolYear: year, questionId });
  const diffPath = path.resolve(process.cwd(), outFile);
  fs.writeFileSync(diffPath, JSON.stringify(preview.diff, null, 2));
  console.error(`Wrote dry-run report to ${diffPath}`);

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          year,
          mode: 'dry-run',
          out: diffPath,
          question: preview.question,
          matched: preview.matched,
          needingReview: preview.needingReview,
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
  console.log(JSON.stringify({ year, mode: 'apply', diff: diffPath, ...result }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
