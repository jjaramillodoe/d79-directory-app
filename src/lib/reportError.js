function reportError(error, context = {}) {
  console.error(error);
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const Sentry = require('@sentry/node');
    if (!global.__d79Sentry) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
      });
      global.__d79Sentry = true;
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      extra: context,
    });
  } catch (sentryError) {
    console.error('Could not report to Sentry:', sentryError.message);
  }
}

module.exports = { reportError };
