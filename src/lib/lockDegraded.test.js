const test = require('node:test');
const assert = require('node:assert');

const { acquireLock, releaseLock } = require('./locking');
const { closeRedis } = require('./redis');

// The unreachable-Redis case leaves a cached ioredis client behind, and its open socket
// keeps the process alive past the last assertion.
test.after(async () => {
  await closeRedis();
});

// These exercise the in-memory fallback path, which is what runs whenever getRedis()
// returns null. The distinction under test is not whether the lock is granted -- it always
// is -- but whether the caller is told the lock is only process-local. Without REDIS_URL
// that is the expected single-instance local setup and must stay quiet, otherwise every
// developer would see a scary banner. With REDIS_URL set but Redis unreachable, the
// deployment is probably multi-instance and the "being edited by" indicator is blind to
// peers, which the user needs to know.
function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (async () => {
    try {
      return await fn();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  })();
}

let seq = 0;
const uniqueStep = () => `step_${process.pid}_${seq++}`;

test('lock without REDIS_URL is granted and not flagged degraded', async () => {
  await withEnv({ REDIS_URL: undefined }, async () => {
    const step = uniqueStep();
    const result = await acquireLock('form1', step, 'user1', 'User One', 'one@example.com', 30);
    assert.strictEqual(result.success, true);
    assert.ok(!result.degraded, 'a local no-Redis setup must not warn the user');
    await releaseLock('form1', step, 'user1');
  });
});

test('lock with REDIS_URL configured but unreachable is granted and flagged degraded', async () => {
  // Port 1 refuses immediately, so this does not depend on a real Redis being absent.
  await withEnv({ REDIS_URL: 'redis://127.0.0.1:1' }, async () => {
    const step = uniqueStep();
    const result = await acquireLock('form1', step, 'user1', 'User One', 'one@example.com', 30);
    assert.strictEqual(result.success, true, 'must fail open: correctness comes from revisionCount');
    assert.strictEqual(result.degraded, true, 'user must be told the indicator is unreliable');
    await releaseLock('form1', step, 'user1');
  });
});

test('a second user is still refused by the in-memory fallback within one process', async () => {
  await withEnv({ REDIS_URL: undefined }, async () => {
    const step = uniqueStep();
    const first = await acquireLock('form1', step, 'user1', 'User One', 'one@example.com', 30);
    assert.strictEqual(first.success, true);

    const second = await acquireLock('form1', step, 'user2', 'User Two', 'two@example.com', 30);
    assert.strictEqual(second.success, false);
    assert.match(second.message, /User One/);

    await releaseLock('form1', step, 'user1');
  });
});

test('the owner can re-acquire their own lock across id types', async () => {
  await withEnv({ REDIS_URL: undefined }, async () => {
    const step = uniqueStep();
    await acquireLock('form1', step, 'abc123', 'User One', 'one@example.com', 30);
    // A string id on the way in against a stored value of another type is the shape that
    // broke refreshLock; acquireLock must not regress the same way.
    const again = await acquireLock('form1', step, 'abc123', 'User One', 'one@example.com', 30);
    assert.strictEqual(again.success, true);
    await releaseLock('form1', step, 'abc123');
  });
});
