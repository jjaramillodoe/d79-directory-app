const Redis = require('ioredis');

function redisGlobal() {
  if (!global.__d79Redis) {
    global.__d79Redis = { client: null, connecting: null, disabledUntil: 0, loggedError: false };
  }
  return global.__d79Redis;
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

async function rateLimit(key, limit, windowSeconds, { failClosed = false } = {}) {
  const redis = await getRedis();
  if (!redis) {
    if (failClosed) {
      return { ok: false, remaining: 0, retryAfter: 60, unavailable: true };
    }
    return { ok: true, remaining: limit, retryAfter: 0 };
  }
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { ok: false, remaining: 0, retryAfter: Math.max(ttl, 1) };
  }
  return { ok: true, remaining: Math.max(limit - count, 0), retryAfter: 0 };
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

async function isTokenDenied(jti) {
  if (!jti) return false;
  const redis = await getRedis();
  if (!redis) return false;
  return (await redis.exists(denyKey(jti))) === 1;
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
  scanKeys,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  rateLimit,
  denyToken,
  isTokenDenied,
  questionBankCacheKey,
  invalidateQuestionBankCache,
  invalidateYearCache,
  invalidateOverviewCache,
  flushAppCaches,
  resetRedisBackoff,
  getRedisHealth,
};
