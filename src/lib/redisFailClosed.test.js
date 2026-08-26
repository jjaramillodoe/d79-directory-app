// Guards the token-revocation fail-closed policy.
//
// The dangerous mistake here is conflating "this deployment has no Redis" with "Redis is
// down": failing closed on the former would sign out every user in any environment that
// runs without REDIS_URL, permanently. These tests pin the safe half of that distinction,
// which is the half that can be checked without a live Redis.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isTokenDenied, redisConfigured, productionFailClosed } = require('./redis');

// Always awaited, so that env vars are restored only after an async body has settled.
async function withEnv(vars, run) {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('redisConfigured tracks REDIS_URL', async () => {
  await withEnv({ REDIS_URL: undefined }, () => assert.equal(redisConfigured(), false));
  await withEnv({ REDIS_URL: 'redis://localhost:6379' }, () =>
    assert.equal(redisConfigured(), true)
  );
});

test('productionFailClosed is true only in production', async () => {
  await withEnv({ NODE_ENV: 'development', VERCEL_ENV: undefined }, () =>
    assert.equal(productionFailClosed(), false)
  );
  await withEnv({ NODE_ENV: 'test', VERCEL_ENV: 'preview' }, () =>
    assert.equal(productionFailClosed(), false)
  );
  await withEnv({ NODE_ENV: 'production', VERCEL_ENV: undefined }, () =>
    assert.equal(productionFailClosed(), true)
  );
  await withEnv({ NODE_ENV: 'development', VERCEL_ENV: 'production' }, () =>
    assert.equal(productionFailClosed(), true)
  );
});

test('an empty jti is never treated as denied', async () => {
  assert.equal(await isTokenDenied(''), false);
  assert.equal(await isTokenDenied(null), false);
  assert.equal(await isTokenDenied(undefined), false);
});

test('without REDIS_URL no token is denied, even in production', async () => {
  // This is the regression that would lock every user out of a Redis-less deployment.
  await withEnv({ REDIS_URL: undefined, NODE_ENV: 'production' }, async () => {
    assert.equal(await isTokenDenied('some-jti'), false);
  });
  await withEnv({ REDIS_URL: undefined, VERCEL_ENV: 'production' }, async () => {
    assert.equal(await isTokenDenied('some-jti'), false);
  });
});
