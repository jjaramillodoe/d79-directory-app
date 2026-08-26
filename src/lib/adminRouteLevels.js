/**
 * Minimum user level required for each admin page and API path.
 *
 * Admin routes require level 5 unless listed below.
 *
 * This used to be the other way round: `src/proxy.js` held a `SUPER_ADMIN_APIS` allowlist of
 * level-5 paths and everything else under /api/admin defaulted to level 4. That default was
 * the problem. Adding a new district-wide admin route and forgetting to register it silently
 * exposed it to every principal, and nothing in the codebase would have flagged it. Inverting
 * the default means forgetting locks out a super-admin feature — noticed immediately — rather
 * than leaking one.
 *
 * Both lists are exhaustive over the filesystem, enforced by `adminRouteLevels.test.js`, so
 * adding a route without classifying it fails the test run.
 *
 * Kept free of `next/server` and node builtins so it can be imported both by the proxy
 * (which runs in a constrained runtime) and by the tests.
 */

// Prefix matching applies, so an entry also covers everything beneath it.
const LEVEL_4_PAGES = ['/admin/users'];

// These are the admin APIs whose handlers scope their own reads to the actor's school, which
// is what makes them safe for a principal. The comments record where that happens; if one of
// them stops scoping, it belongs at level 5 instead.
const LEVEL_4_APIS = [
  '/api/admin/forms/share', // restricted to the actor's school in the handler
  '/api/admin/principals', // filters the roster to own school for level 4
  '/api/admin/reports', // applies schoolScopeFilter for level 4
  '/api/admin/timeline', // requireAdminActor plus schoolScopeFilter
  '/api/admin/users/school', // creates users at own school, capped below own level
];

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function requiredAdminLevel(pathname) {
  const level4 = pathname.startsWith('/api/admin') ? LEVEL_4_APIS : LEVEL_4_PAGES;
  return matchesPrefix(pathname, level4) ? 4 : 5;
}

module.exports = {
  LEVEL_4_PAGES,
  LEVEL_4_APIS,
  matchesPrefix,
  requiredAdminLevel,
};
