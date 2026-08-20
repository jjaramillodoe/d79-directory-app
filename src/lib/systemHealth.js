const mongoose = require('mongoose');
const connectDB = require('./mongodb');
const { getRedisHealth } = require('./redis');
const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');
const FormComment = require('../models/FormComment');
const AuditLog = require('../models/AuditLog');
const FormTemplate = require('../models/FormTemplate');
const SchoolYearSettings = require('../models/SchoolYearSettings');

const READY_STATE = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds) {
  const total = Math.max(Number(seconds) || 0, 0);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${total}s`;
}

function envFlag(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function getApiHealth() {
  const memory = process.memoryUsage();
  return {
    ok: true,
    env: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV || null,
    region: process.env.VERCEL_REGION || null,
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    uptimeHuman: formatDuration(process.uptime()),
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      rssHuman: formatBytes(memory.rss),
      heapUsedHuman: formatBytes(memory.heapUsed),
    },
  };
}

function getEnvChecklist() {
  return [
    { key: 'MONGODB_URI', set: envFlag('MONGODB_URI'), required: true },
    { key: 'NEXTAUTH_URL', set: envFlag('NEXTAUTH_URL'), required: true },
    { key: 'NEXTAUTH_SECRET', set: envFlag('NEXTAUTH_SECRET'), required: true },
    { key: 'GOOGLE_CLIENT_ID', set: envFlag('GOOGLE_CLIENT_ID'), required: true },
    { key: 'GOOGLE_CLIENT_SECRET', set: envFlag('GOOGLE_CLIENT_SECRET'), required: true },
    { key: 'REDIS_URL', set: envFlag('REDIS_URL'), required: false },
    { key: 'SENTRY_DSN', set: envFlag('SENTRY_DSN'), required: false },
  ];
}

async function getMongoHealth() {
  const started = Date.now();
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return {
        ok: false,
        status: 'down',
        pingMs: Date.now() - started,
        message: 'MongoDB connected but the database handle is missing',
      };
    }

    await db.command({ ping: 1 });
    const pingMs = Date.now() - started;

    const [
      stats,
      collectionList,
      formCount,
      userCount,
      commentCount,
      auditCount,
      templateCount,
      yearSettingsCount,
      indexList,
      formsByYear,
      formsByStatus,
      usersByLevel,
    ] = await Promise.all([
      db.stats(),
      db.listCollections({}, { nameOnly: true }).toArray(),
      FormSubmission.estimatedDocumentCount(),
      User.estimatedDocumentCount(),
      FormComment.estimatedDocumentCount(),
      AuditLog.estimatedDocumentCount(),
      FormTemplate.estimatedDocumentCount(),
      SchoolYearSettings.estimatedDocumentCount(),
      FormSubmission.collection.indexes().catch(() => []),
      FormSubmission.aggregate([
        { $group: { _id: '$schoolYear', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      FormSubmission.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([
        { $group: { _id: { level: '$level', active: '$isActive' }, count: { $sum: 1 } } },
      ]),
    ]);

    const skip = new Set(['system.profile', 'system.indexes']);
    const collectionStats = [];
    for (const collection of collectionList) {
      if (!collection?.name || skip.has(collection.name) || collection.name.startsWith('system.')) {
        continue;
      }
      try {
        const collStats = await db.command({ collStats: collection.name, scale: 1 });
        collectionStats.push({
          name: collection.name,
          count: collStats.count || 0,
          size: collStats.size || 0,
          sizeHuman: formatBytes(collStats.size),
          storageSize: collStats.storageSize || 0,
          storageHuman: formatBytes(collStats.storageSize),
          indexSize: collStats.totalIndexSize || 0,
          indexHuman: formatBytes(collStats.totalIndexSize),
        });
      } catch (error) {
        collectionStats.push({
          name: collection.name,
          count: 0,
          sizeHuman: '—',
          error: error.message,
        });
      }
    }
    collectionStats.sort((a, b) => (b.size || 0) - (a.size || 0));

    const uniquePlanIndex = indexList.find((index) => index.name === 'schoolName_schoolYear_unique');
    const users = { total: userCount, active: 0, inactive: 0, byLevel: {} };
    usersByLevel.forEach((row) => {
      const level = String(row._id?.level ?? 'unknown');
      users.byLevel[level] = (users.byLevel[level] || 0) + row.count;
      if (row._id?.active === false) users.inactive += row.count;
      else users.active += row.count;
    });

    const status = {};
    formsByStatus.forEach((row) => {
      status[row._id || 'unknown'] = row.count;
    });

    return {
      ok: true,
      status: 'up',
      pingMs,
      name: mongoose.connection.name || stats.db || null,
      host: mongoose.connection.host || null,
      readyState: READY_STATE[mongoose.connection.readyState] || String(mongoose.connection.readyState),
      dataSize: stats.dataSize || 0,
      dataSizeHuman: formatBytes(stats.dataSize),
      storageSize: stats.storageSize || 0,
      storageSizeHuman: formatBytes(stats.storageSize),
      indexSize: stats.indexSize || 0,
      indexSizeHuman: formatBytes(stats.indexSize),
      objects: stats.objects || 0,
      collections: collectionStats,
      counts: {
        forms: formCount,
        users: userCount,
        comments: commentCount,
        auditLogs: auditCount,
        templates: templateCount,
        yearSettings: yearSettingsCount,
      },
      formsByYear: formsByYear.map((row) => ({
        schoolYear: row._id || 'unset',
        count: row.count,
      })),
      formsByStatus: status,
      users,
      uniquePlanIndex: {
        present: Boolean(uniquePlanIndex?.unique),
        name: uniquePlanIndex?.name || null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 'down',
      pingMs: Date.now() - started,
      message: error.message || 'MongoDB health check failed',
    };
  }
}

async function getRecentAudit() {
  try {
    await connectDB();
    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(8)
      .select('action userName timestamp details')
      .lean();
    return logs.map((log) => ({
      action: log.action,
      userName: log.userName,
      timestamp: log.timestamp,
      details: log.details || '',
    }));
  } catch (error) {
    return [];
  }
}

function overallStatus({ api, mongo, redis, env, uniquePlanIndex }) {
  if (!api.ok || !mongo.ok) return 'down';
  const missingRequired = env.some((item) => item.required && !item.set);
  const redisDegraded = redis.configured && !redis.ok;
  const indexMissing = uniquePlanIndex && !uniquePlanIndex.present;
  if (missingRequired || redisDegraded || indexMissing) return 'degraded';
  return 'ok';
}

async function getSystemHealth() {
  const api = getApiHealth();
  const env = getEnvChecklist();
  const [mongo, redis, recentAudit] = await Promise.all([
    getMongoHealth(),
    getRedisHealth(),
    getRecentAudit(),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    overall: overallStatus({
      api,
      mongo,
      redis,
      env,
      uniquePlanIndex: mongo.uniquePlanIndex,
    }),
    api,
    env,
    mongo,
    redis,
    recentAudit,
  };
}

module.exports = {
  getSystemHealth,
  formatBytes,
  formatDuration,
};
