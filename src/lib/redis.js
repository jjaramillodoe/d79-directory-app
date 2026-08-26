const Redis = require('ioredis');

function redisGlobal() {
  if (!global.__d79Redis) {
    global.__d79Redis = { client: null, connecting: null, disabledUntil: 0, loggedError: false };
  }
  return global.__d79Redis;
}

function productionFailClosed() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

// Distinguishes "no Redis in this deployment" from "Redis is configured but unreachable".
// The two must not be conflated: the first has no revocation list to consult, the second
// has one we simply cannot read.
function redisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function isUnreachable(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return ['ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN', 'ECONNREFUSED'].some(
    (token) => code === token || message.includes(token)
  );
}

function disableRedis(slot, client, error, ms = 60_000) {
  slot.client = null;
  slot.disabledUntil = Date.now() + ms;
  if (!slot.loggedError) {
    console.error('Redis unavailable, using in-memory fallback:', error?.message || error);
    slot.loggedError = true;
  }
  if (client) {
    try {
      client.disconnect(false);
    } catch (disconnectError) {
      // ignore
    }
  }
}

// Releases the cached client and the backoff state. Needed anywhere the process should be
// able to exit or hand its connection back: a test file that touched Redis would otherwise
// hang forever on the open socket, and on a graceful shutdown this returns the connection
// instead of waiting for the server to reap it.
async function closeRedis() {
  const slot = redisGlobal();
  const client = slot.client;
  slot.client = null;
  slot.connecting = null;
  slot.disabledUntil = 0;
  slot.loggedError = false;
  if (!client) return;
  try {
    await client.quit();
  } catch (error) {
    try {
      client.disconnect(false);
    } catch (disconnectError) {
      // Already gone; nothing left to release.
    }
  }
}

async function getRedis() {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) return null;

  const slot = redisGlobal();
  if (slot.disabledUntil && Date.now() < slot.disabledUntil) return null;
  if (slot.client && !['end', 'close'].includes(slot.client.status)) {
    return slot.client;
  }

  if (slot.connecting) {
    try {
      return await slot.connecting;
    } catch (error) {
      return null;
    }
  }

  slot.connecting = (async () => {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 200, 1000);
      },
      reconnectOnError: (err) => err.message.includes('READONLY'),
      lazyConnect: true,
    });
    client.on('error', (err) => {
      if (isUnreachable(err)) {
        disableRedis(slot, client, err);
      } else if (!slot.loggedError) {
        console.error('Redis connection error:', err.message);
        slot.loggedError = true;
      }
    });
    try {
      await client.connect();
      await client.ping();
    } catch (error) {
      disableRedis(slot, client, error);
      throw error;
    }
    slot.loggedError = false;
    slot.disabledUntil = 0;
    attachRateLimitCommand(client);
    slot.client = client;
    return client;
  })();

  try {
    return await slot.connecting;
  } catch (error) {
    return null;
  } finally {
    slot.connecting = null;
  }
}

async function scanKeys(pattern, count = 64) {
  const redis = await getRedis();
  if (!redis) return [];
  const keys = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    cursor = next;
    if (batch?.length) keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

async function cacheGet(key) {
  const redis = await getRedis();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds) {
  const redis = await getRedis();
  if (!redis) return false;
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, payload, 'EX', ttlSeconds);
  } else {
    await redis.set(key, payload);
  }
  return true;
}

async function cacheDel(key) {
  const redis = await getRedis();
  if (!redis) return false;
  await redis.del(key);
  return true;
}

async function cacheDelPattern(pattern) {
  const keys = await scanKeys(pattern);
  if (!keys.length) return 0;
  const redis = await getRedis();
  if (!redis) return 0;
  await redis.del(...keys);
  return keys.length;
}

// Counter increment and expiry must be one atomic step. As two round trips, a process
// killed between INCR and EXPIRE (routine in serverless) leaves a key with no TTL, and
// the counter then climbs forever and locks that caller out permanently. The PTTL < 0
// branch also re-arms any such orphaned key left behind by the old implementation.
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

function attachRateLimitCommand(client) {
  if (!client || typeof client.rateLimitHit === 'function') return;
  client.defineCommand('rateLimitHit', { numberOfKeys: 1, lua: RATE_LIMIT_SCRIPT });
}

async function rateLimit(key, limit, windowSeconds, { failClosed = false } = {}) {
  const unavailable = failClosed
    ? { ok: false, remaining: 0, retryAfter: 60, unavailable: true }
    : { ok: true, remaining: limit, retryAfter: 0 };

  let redis = null;
  try {
    redis = await getRedis();
  } catch (error) {
    redis = null;
  }
  if (!redis) return unavailable;

  try {
    attachRateLimitCommand(redis);
    const [rawCount, rawTtl] = await redis.rateLimitHit(key, windowSeconds * 1000);
    const count = Number(rawCount);
    const retryAfter = Math.max(Math.ceil(Number(rawTtl) / 1000), 1);

    if (count > limit) {
      return { ok: false, remaining: 0, retryAfter };
    }
    return { ok: true, remaining: Math.max(limit - count, 0), retryAfter: 0 };
  } catch (error) {
    // Previously an error here propagated into middleware as a 500.
    console.error('Rate limit check failed:', error?.message || error);
    return unavailable;
  }
}

function denyKey(jti) {
  return `sess:deny:${jti}`;
}

async function denyToken(jti, exp) {
  if (!jti) return false;
  const redis = await getRedis();
  if (!redis) return false;
  const ttl = Math.max(Number(exp) - Math.floor(Date.now() / 1000), 60);
  await redis.set(denyKey(jti), '1', 'EX', Number.isFinite(ttl) ? ttl : 8 * 60 * 60);
  return true;
}

// Returns true when the caller must reject the token.
//
// Redis is the only record that a token was revoked, so being unable to read it is not
// the same as the token being valid. In production that ambiguity rejects the token,
// which means a Redis outage signs users out rather than honoring logouts that may
// already have happened. Deployments with no REDIS_URL never had a revocation list in
// the first place and are deliberately left alone, otherwise turning this on would lock
// every user out of any environment that runs without Redis.
async function isTokenDenied(jti) {
  if (!jti) return false;
  if (!redisConfigured()) return false;

  let redis = null;
  try {
    redis = await getRedis();
  } catch (error) {
    redis = null;
  }
  if (!redis) return productionFailClosed();

  try {
    return (await redis.exists(denyKey(jti))) === 1;
  } catch (error) {
    console.error('Token revocation check failed:', error?.message || error);
    return productionFailClosed();
  }
}

function questionBankCacheKey({ schoolYear, version, preferPublished } = {}) {
  return `qb:published:${schoolYear || 'latest'}:${version || 'head'}:${preferPublished ? 'live' : 'pin'}`;
}

async function invalidateQuestionBankCache() {
  await cacheDelPattern('qb:published:*');
}

async function invalidateYearCache(schoolYear) {
  if (schoolYear) await cacheDel(`year:${schoolYear}`);
  else await cacheDelPattern('year:*');
}

async function invalidateOverviewCache() {
  await cacheDelPattern('public:overview:*');
}

function parseRedisInfo(raw) {
  const out = {};
  String(raw || '')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const sep = trimmed.indexOf(':');
      if (sep === -1) return;
      out[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/\r$/, '');
    });
  return out;
}

async function countKeys(pattern) {
  const keys = await scanKeys(pattern);
  return keys.length;
}

async function flushAppCaches() {
  const [questionBank, years, overview] = await Promise.all([
    cacheDelPattern('qb:published:*'),
    cacheDelPattern('year:*'),
    cacheDelPattern('public:overview:*'),
  ]);
  return { questionBank, years, overview, total: questionBank + years + overview };
}

function resetRedisBackoff() {
  const slot = redisGlobal();
  slot.disabledUntil = 0;
  slot.loggedError = false;
}

async function getRedisHealth() {
  const configured = Boolean(process.env.REDIS_URL);
  const slot = redisGlobal();
  const backingOff = Boolean(slot.disabledUntil && Date.now() < slot.disabledUntil);

  if (!configured) {
    return {
      ok: false,
      configured: false,
      status: 'not_configured',
      message: 'REDIS_URL is not set. Locks, cache, and save rate limits use in-memory fallback.',
    };
  }

  if (backingOff) {
    return {
      ok: false,
      configured: true,
      status: 'backing_off',
      retryInSeconds: Math.max(Math.ceil((slot.disabledUntil - Date.now()) / 1000), 1),
      message: 'Redis was unreachable. The app is using in-memory fallback until retry.',
    };
  }

  const started = Date.now();
  const redis = await getRedis();
  if (!redis) {
    const stillBackingOff = Boolean(redisGlobal().disabledUntil && Date.now() < redisGlobal().disabledUntil);
    return {
      ok: false,
      configured: true,
      status: stillBackingOff ? 'backing_off' : 'down',
      pingMs: Date.now() - started,
      retryInSeconds: stillBackingOff
        ? Math.max(Math.ceil((redisGlobal().disabledUntil - Date.now()) / 1000), 1)
        : 0,
      message: 'Redis ping failed. Locks, cache, and save rate limits are using in-memory fallback.',
    };
  }

  try {
    await redis.ping();
    const pingMs = Date.now() - started;
    const [infoRaw, dbsize, questionBankKeys, yearKeys, overviewKeys, lockKeys, editorKeys, rateLimitKeys] =
      await Promise.all([
        redis.info(),
        redis.dbsize(),
        countKeys('qb:published:*'),
        countKeys('year:*'),
        countKeys('public:overview:*'),
        countKeys('form:*:step:*'),
        countKeys('form:*:editor:*'),
        countKeys('rl:*'),
      ]);
    const info = parseRedisInfo(infoRaw);
    return {
      ok: true,
      configured: true,
      status: 'up',
      pingMs,
      version: info.redis_version || null,
      role: info.role || null,
      usedMemory: Number(info.used_memory) || 0,
      usedMemoryHuman: info.used_memory_human || null,
      peakMemoryHuman: info.used_memory_peak_human || null,
      maxMemoryHuman: info.maxmemory_human && info.maxmemory_human !== '0B' ? info.maxmemory_human : null,
      keys: Number(dbsize) || 0,
      clients: Number(info.connected_clients) || 0,
      uptimeSeconds: Number(info.uptime_in_seconds) || 0,
      opsPerSecond: Number(info.instantaneous_ops_per_sec) || 0,
      evictedKeys: Number(info.evicted_keys) || 0,
      keyspace: {
        cache: {
          questionBank: questionBankKeys,
          years: yearKeys,
          overview: overviewKeys,
          total: questionBankKeys + yearKeys + overviewKeys,
        },
        locks: lockKeys,
        editors: editorKeys,
        rateLimits: rateLimitKeys,
      },
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      status: 'down',
      pingMs: Date.now() - started,
      message: error.message || 'Redis health check failed',
    };
  }
}

module.exports = {
  getRedis,
  closeRedis,
  scanKeys,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  rateLimit,
  denyToken,
  isTokenDenied,
  productionFailClosed,
  redisConfigured,
  questionBankCacheKey,
  invalidateQuestionBankCache,
  invalidateYearCache,
  invalidateOverviewCache,
  flushAppCaches,
  resetRedisBackoff,
  getRedisHealth,
};
