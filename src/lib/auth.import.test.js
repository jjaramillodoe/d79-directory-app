const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('loading auth.js without NEXTAUTH_SECRET does not throw', () => {
  // Vercel preview builds compile fine, then fail while collecting page data because
  // webpack evaluates every API route, which imports this module. Preview env vars
  // often omit the secret at build time. The import must stay side-effect free.
  const env = { ...process.env };
  delete env.NEXTAUTH_SECRET;

  const result = spawnSync(
    process.execPath,
    ['-e', `require(${JSON.stringify(path.join(__dirname, 'auth.js'))})`],
    { env, encoding: 'utf8' }
  );

  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || 'child process failed with no output'
  );
  assert.doesNotMatch(result.stderr || '', /NEXTAUTH_SECRET is required/);
});
