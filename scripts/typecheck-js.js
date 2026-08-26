#!/usr/bin/env node
/**
 * A ratchet for adopting `checkJs` incrementally.
 *
 * Turning `checkJs` on wholesale is not an option yet: it reports a few hundred errors, and
 * `next.config.js` sets `typescript.ignoreBuildErrors: false`, so flipping it in tsconfig.json
 * would break the build. Deleting the goal instead is how a codebase stays untyped forever.
 *
 * So: run the check against a separate config, count the errors per directory, and compare with
 * a committed baseline. New errors fail the run. Fewer errors also "fail", with a message
 * telling you to commit the lower number, which is what keeps the baseline honest rather than
 * quietly drifting upward.
 *
 *   npm run typecheck:js            check against the baseline
 *   npm run typecheck:js -- --update rewrite the baseline
 *   npm run typecheck:js -- --list   print the current errors
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(__dirname, '..', 'typecheck-baseline.json');
const CONFIG = 'tsconfig.checkjs.json';

const update = process.argv.includes('--update');
const list = process.argv.includes('--list');

function runTsc() {
  try {
    execFileSync('npx', ['tsc', '--noEmit', '-p', CONFIG], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return '';
  } catch (e) {
    // tsc exits non-zero when it reports errors, which is the normal path here.
    return `${e.stdout || ''}${e.stderr || ''}`;
  }
}

const output = runTsc();
const errorLines = output
  .split('\n')
  .filter((l) => /^[^\s].*\(\d+,\d+\): error TS\d+/.test(l));

// Group by top-level source directory so a regression points somewhere useful.
const counts = {};
for (const line of errorLines) {
  const file = line.slice(0, line.indexOf('('));
  const parts = file.split('/');
  const group = parts.length > 1 ? `${parts[0]}/${parts[1]}` : file;
  counts[group] = (counts[group] || 0) + 1;
}

const current = { total: errorLines.length, byDirectory: counts };

if (list) {
  for (const line of errorLines) console.log(line);
  console.log(`\n${current.total} errors`);
  process.exit(0);
}

if (update || !fs.existsSync(BASELINE)) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Baseline written: ${current.total} errors`);
  for (const [dir, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${dir}`);
  }
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

if (current.total > baseline.total) {
  console.error(`checkJs errors increased: ${baseline.total} -> ${current.total}\n`);
  const regressions = Object.entries(counts)
    .filter(([dir, n]) => n > (baseline.byDirectory[dir] || 0))
    .sort((a, b) => b[1] - a[1]);
  for (const [dir, n] of regressions) {
    console.error(`  ${dir}: ${baseline.byDirectory[dir] || 0} -> ${n}`);
  }
  console.error('\nRun `npm run typecheck:js -- --list` to see them.');
  process.exit(1);
}

if (current.total < baseline.total) {
  console.log(`checkJs errors reduced: ${baseline.total} -> ${current.total}. Nice.`);
  console.log('Commit the new floor with `npm run typecheck:js -- --update`.');
  process.exit(1);
}

console.log(`checkJs errors unchanged at ${current.total}.`);
process.exit(0);
