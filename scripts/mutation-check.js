#!/usr/bin/env node
/**
 * A characterization suite is only worth the disk it occupies if it fails when behavior changes.
 * This applies a handful of deliberate breakages to the form editor, one at a time, and reports
 * whether the tests noticed. Every mutation must produce at least one failure; a "SURVIVED" line
 * means the suite has a blind spot exactly where the refactor is about to happen.
 *
 * Not a general-purpose mutation testing tool and not meant to run in CI — it edits a source file
 * in place and restores it afterwards. Run it by hand after changing the tests.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PAGE = path.join(__dirname, '..', 'src', 'app', 'form', '[id]', 'page.js');
const TESTS = 'src/app/form';

const MUTATIONS = [
  {
    name: 'permission fallback: same-school principal gets view instead of edit',
    from: "          } else if (isSameSchool) {\n            permissions = 'edit';",
    to: "          } else if (isSameSchool) {\n            permissions = 'view';",
  },
  {
    name: 'permission: ignore the permission the API returned',
    from: '        if (data.userPermission) {\n          setUserPermissions(data.userPermission);',
    to: '        if (false && data.userPermission) {\n          setUserPermissions(data.userPermission);',
  },
  {
    name: 'loading: ignore the saved currentStep',
    from: 'setCurrentStep(data.form.currentStep',
    to: 'setCurrentStep(1 || data.form.currentStep',
  },
  {
    name: 'navigation: allow re-navigating to the current step',
    from: 'if (stepNumber === currentStep) return;',
    to: 'if (false) return;',
  },
  {
    name: 'collaboration: never register as an active editor',
    from: '/editors/register',
    to: '/editors/register-DISABLED',
  },
];

function runTests() {
  try {
    execFileSync('npx', ['vitest', 'run', TESTS], { stdio: 'pipe', encoding: 'utf8' });
    return { failed: 0, output: '' };
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    const m = out.match(/Tests\s+(\d+) failed/);
    return { failed: m ? Number(m[1]) : -1, output: out };
  }
}

const original = fs.readFileSync(PAGE, 'utf8');
let survived = 0;
let unapplied = 0;

process.on('exit', () => fs.writeFileSync(PAGE, original));

console.log('Baseline (no mutation):');
const baseline = runTests();
if (baseline.failed !== 0) {
  console.log(`  tests already failing (${baseline.failed}); fix before mutation testing.`);
  process.exit(1);
}
console.log('  all green\n');

for (const mutation of MUTATIONS) {
  if (!original.includes(mutation.from)) {
    console.log(`SKIP     ${mutation.name}`);
    console.log('         (anchor not found — the source moved, update this script)');
    unapplied += 1;
    continue;
  }

  fs.writeFileSync(PAGE, original.replace(mutation.from, mutation.to));
  const { failed } = runTests();
  fs.writeFileSync(PAGE, original);

  if (failed > 0) {
    console.log(`CAUGHT   ${mutation.name} (${failed} failing)`);
  } else {
    console.log(`SURVIVED ${mutation.name}`);
    survived += 1;
  }
}

console.log();
if (survived || unapplied) {
  console.log(`${survived} mutation(s) survived, ${unapplied} could not be applied.`);
  process.exit(1);
}
console.log(`All ${MUTATIONS.length} mutations caught.`);
