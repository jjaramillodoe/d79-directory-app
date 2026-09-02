#!/usr/bin/env node
/**
 * Seed an empty plan's formData from a published question bank.
 *
 *   node src/scripts/populate-form-from-bank.js
 *   node src/scripts/populate-form-from-bank.js --form 6a984358b830c20bfe0b9d8c --label "2026-2027 Draft v23"
 *   node src/scripts/populate-form-from-bank.js --form 6a984358b830c20bfe0b9d8c --apply
 */

const connectDB = require('../lib/mongodb');
const {
  previewFormPopulation,
  populateEmptyFormFromBank,
} = require('../lib/populateFormFromBank');

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

async function main() {
  const formId = argValue('--form', '6a984358b830c20bfe0b9d8c');
  const version = Number(argValue('--version', '23'));
  const schoolYear = argValue('--year', '2026-2027');
  const label = argValue('--label', '2026-2027 Draft v23');
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');

  await connectDB();

  if (!apply) {
    const preview = await previewFormPopulation({ formId, version, schoolYear, label });
    console.log(JSON.stringify({ mode: 'dry-run', ...preview }, null, 2));
    process.exit(0);
  }

  const result = await populateEmptyFormFromBank({
    formId,
    version,
    schoolYear,
    label,
    force,
  });
  console.log(JSON.stringify({ mode: 'apply', ...result }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(error.status && error.status < 500 ? 2 : 1);
});
