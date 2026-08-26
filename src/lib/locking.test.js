const test = require('node:test');
const assert = require('node:assert');

const {
  acquireLock,
  releaseLock,
  refreshLock,
  getLockInfo,
  getFormLocks,
  cleanupExpiredLocks,
} = require('./locking');

// These run against the in-memory fallback, which is the path taken whenever getRedis()
// returns null. That is not a compromise: the ownership comparisons under test are shared
// with the Redis path, and the type-coercion bug this file mainly guards against
// (`refreshLock` using `===` where `releaseLock` used `sameUser`) existed identically in
// both branches.
//
// `lockDegraded.test.js` covers the `degraded` flag. This file covers the lock semantics:
// who may take, keep, and release a lock.
//
// No REDIS_URL means getRedis() returns null without opening a socket, so nothing here
// needs cleanup. Each test uses a unique form id because the fallback map is module state
// shared across the file.
delete process.env.REDIS_URL;

let formCounter = 0;
const nextFormId = () => `form-${++formCounter}`;

// Mongoose hands back ObjectIds, not strings. The whole point of `sameUser` is that an
// ObjectId read out of a lock and a string arriving from a request body are the same person,
// so the tests need something that stringifies like one rather than a bare string.
const objectId = (hex) => ({ toString: () => hex });

// A negative TTL backdates `expiresAt`, so the read-time `expiresAt < now` comparison is
// unambiguous. A TTL of 0 lands the expiry in the same millisecond it is written, which made
// these assertions depend on whether the clock happened to tick mid-test.
const EXPIRED = -10;

test('acquireLock: an uncontended lock is granted to the caller', async () => {
  const formId = nextFormId();
  const result = await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc');
  assert.equal(result.success, true);
  assert.equal(result.lockedBy.userId, 'user-1');
  assert.equal(result.lockedBy.userName, 'Ada');
  assert.equal(result.lockedBy.email, 'ada@d79.nyc');
});

test('acquireLock: a second user is refused and told who holds it', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc');

  const result = await acquireLock(formId, 'step1', 'user-2', 'Grace', 'grace@d79.nyc');
  assert.equal(result.success, false);
  assert.equal(result.lockedBy.userId, 'user-1');
  assert.match(result.message, /being edited by Ada/);
});

test('acquireLock: the owner re-acquiring extends rather than being refused', async () => {
  const formId = nextFormId();
  const first = await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', 60);
  const firstExpiry = new Date(first.lockedBy.expiresAt).getTime();

  const second = await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', 600);
  assert.equal(second.success, true);
  assert.ok(
    new Date(second.lockedBy.expiresAt).getTime() > firstExpiry,
    'a re-acquire by the owner should push the expiry out'
  );
});

test('acquireLock: the owner is recognized across an ObjectId/string mismatch', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', objectId('507f1f77bcf86cd799439011'), 'Ada', 'ada@d79.nyc');

  const again = await acquireLock(
    formId,
    'step1',
    '507f1f77bcf86cd799439011',
    'Ada',
    'ada@d79.nyc'
  );
  assert.equal(again.success, true, 'the same user in a different id type must not be locked out');
});

test('acquireLock: locks are scoped per step, not per form', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc');

  const other = await acquireLock(formId, 'step2', 'user-2', 'Grace', 'grace@d79.nyc');
  assert.equal(other.success, true, 'a different step must be independently lockable');
});

test('acquireLock: an expired lock is taken over by the next caller', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', EXPIRED);

  const result = await acquireLock(formId, 'step1', 'user-2', 'Grace', 'grace@d79.nyc');
  assert.equal(result.success, true);
  assert.equal(result.lockedBy.userId, 'user-2');
});

test('releaseLock: the owner can release, and only once', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc');

  assert.equal(await releaseLock(formId, 'step1', 'user-1'), true);
  assert.equal(
    await releaseLock(formId, 'step1', 'user-1'),
    false,
    'releasing an absent lock reports false'
  );
});

test('releaseLock: a non-owner cannot release someone else\u2019s lock', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc');

  assert.equal(await releaseLock(formId, 'step1', 'user-2'), false);
  const info = await getLockInfo(formId, 'step1');
  assert.equal(info.userId, 'user-1', 'the original lock must survive a foreign release');
});

test('releaseLock: the owner is recognized across an ObjectId/string mismatch', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', objectId('507f1f77bcf86cd799439011'), 'Ada', 'ada@d79.nyc');
  assert.equal(await releaseLock(formId, 'step1', '507f1f77bcf86cd799439011'), true);
});

test('refreshLock: the owner can extend an existing lock', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', 60);
  const before = (await getLockInfo(formId, 'step1')).expiresAt.getTime();

  assert.equal(await refreshLock(formId, 'step1', 'user-1', 600), true);
  const after = (await getLockInfo(formId, 'step1')).expiresAt.getTime();
  assert.ok(after > before, 'refresh should push the expiry out');
});

test('refreshLock: a non-owner cannot extend, and the real expiry is untouched', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', 60);
  const before = (await getLockInfo(formId, 'step1')).expiresAt.getTime();

  assert.equal(await refreshLock(formId, 'step1', 'user-2', 600), false);
  assert.equal((await getLockInfo(formId, 'step1')).expiresAt.getTime(), before);
});

test('refreshLock: refreshing an absent lock reports false', async () => {
  assert.equal(await refreshLock(nextFormId(), 'step1', 'user-1'), false);
});

test('refreshLock: the owner is recognized across an ObjectId/string mismatch', async () => {
  // This is the regression test for the original defect. `refreshLock` compared with `===`
  // while `releaseLock` used `sameUser`, so an owner whose id arrived in a different type
  // could not renew their own lock: it expired mid-edit and a collaborator could take the
  // step out from under them.
  const formId = nextFormId();
  await acquireLock(formId, 'step1', objectId('507f1f77bcf86cd799439011'), 'Ada', 'ada@d79.nyc');
  assert.equal(await refreshLock(formId, 'step1', '507f1f77bcf86cd799439011', 600), true);
});

test('getLockInfo: reports null for an unlocked step', async () => {
  assert.equal(await getLockInfo(nextFormId(), 'step1'), null);
});

test('getLockInfo: an expired lock reads as null and is cleared', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', EXPIRED);
  assert.equal(await getLockInfo(formId, 'step1'), null);
});

test('getFormLocks: returns only the locks belonging to the form', async () => {
  const formId = nextFormId();
  const otherFormId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc');
  await acquireLock(formId, 'step2', 'user-2', 'Grace', 'grace@d79.nyc');
  await acquireLock(otherFormId, 'step1', 'user-3', 'Alan', 'alan@d79.nyc');

  const locks = await getFormLocks(formId);
  assert.equal(locks.length, 2);
  assert.deepEqual(
    locks.map((l) => l.stepKey).sort(),
    ['step1', 'step2'],
    'each entry should identify its step'
  );

  // A prefix match on `form:<id>:step:` must not leak a different form's locks.
  const otherLocks = await getFormLocks(otherFormId);
  assert.equal(otherLocks.length, 1);
  assert.equal(otherLocks[0].userId, 'user-3');
});

test('getFormLocks: expired locks are excluded', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', EXPIRED);
  await acquireLock(formId, 'step2', 'user-1', 'Ada', 'ada@d79.nyc', 600);

  const locks = await getFormLocks(formId);
  assert.deepEqual(
    locks.map((l) => l.stepKey),
    ['step2']
  );
});

test('cleanupExpiredLocks: drops expired entries and keeps live ones', async () => {
  const formId = nextFormId();
  await acquireLock(formId, 'step1', 'user-1', 'Ada', 'ada@d79.nyc', EXPIRED);
  await acquireLock(formId, 'step2', 'user-1', 'Ada', 'ada@d79.nyc', 600);

  await cleanupExpiredLocks();

  assert.equal(await getLockInfo(formId, 'step1'), null);
  assert.ok(await getLockInfo(formId, 'step2'), 'a live lock must survive the sweep');
});
