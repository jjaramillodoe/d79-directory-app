/**
 * Console logging that knows the difference between diagnostics and failures.
 *
 * The codebase had accumulated a few hundred bare `console.*` calls, most of them
 * step-by-step tracing left behind after debugging. In client code that tracing ships to every
 * user's browser console, where it is noise at best and at worst leaks the shape of internal
 * data to anyone who opens devtools.
 *
 * The split:
 *
 *  - `debug` and `warn` are development aids. They compile to no-ops in production.
 *  - `error` always logs. A principal reporting "it just stopped working" is far easier to help
 *    when the browser console still holds the failure, and the message is one the code chose to
 *    write rather than raw data.
 *
 * `process.env.NODE_ENV` is inlined at build time by Next, so in the production client bundle
 * `debug` and `warn` minify to empty functions while `error` keeps its `console.error`. Verified
 * by inspecting the built chunks, not assumed.
 *
 * Worth being precise about what that does and does not buy: the call sites survive, so the
 * arguments are still constructed and passed to a function that discards them, and the message
 * strings still occupy space in the bundle. Nothing is printed, which is the point, but a
 * `logger.debug` in a hot loop is not free — build the expensive part inside the call only if
 * you have checked `logger.isProduction` first.
 *
 * Server code should prefer `reportError` from `./reportError`, which logs *and* forwards to
 * Sentry. This module is for the browser, and for the few server paths where reporting would
 * be counterproductive — see the note in `redis.js`.
 */

const isProduction = process.env.NODE_ENV === 'production';

function debug(...args) {
  if (isProduction) return;
  console.log(...args);
}

function warn(...args) {
  if (isProduction) return;
  console.warn(...args);
}

function error(...args) {
  console.error(...args);
}

module.exports = { debug, warn, error, isProduction };
