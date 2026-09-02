const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  LEVEL_4_APIS,
  LEVEL_4_PAGES,
  requiredAdminLevel,
} = require('./adminRouteLevels');

const APP_DIR = path.join(__dirname, '..', 'app');

function routesUnder(dir, filename) {
  const root = path.join(APP_DIR, dir);
  if (!fs.existsSync(root)) return [];

  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === filename) {
        const rel = path.relative(APP_DIR, path.dirname(full));
        found.push(`/${rel.split(path.sep).join('/')}`);
      }
    }
  };
  walk(root);
  return found.sort();
}

const adminApis = routesUnder(path.join('api', 'admin'), 'route.js');
const adminPages = routesUnder('admin', 'page.js');

test('there are admin routes to classify (guards against a broken discovery walk)', () => {
  // Without this, a bug in routesUnder would make every assertion below pass vacuously.
  assert.ok(adminApis.length >= 15, `expected to discover admin APIs, found ${adminApis.length}`);
  assert.ok(adminPages.length >= 5, `expected to discover admin pages, found ${adminPages.length}`);
});

test('every admin API resolves to level 4 or 5, never lower', () => {
  for (const route of adminApis) {
    const level = requiredAdminLevel(route);
    assert.ok(level === 4 || level === 5, `${route} resolved to level ${level}`);
  }
});

test('an unclassified admin route defaults to level 5, not 4', () => {
  // This is the whole point of the inversion. A route added tomorrow and never registered
  // must come out closed.
  assert.equal(requiredAdminLevel('/api/admin/some-new-district-wide-thing'), 5);
  assert.equal(requiredAdminLevel('/api/admin/nested/deeply/new'), 5);
  assert.equal(requiredAdminLevel('/admin/brand-new-page'), 5);
});

test('the level-4 API list contains no stale entries', () => {
  // A path left behind after a route is deleted or renamed is a standing grant to a route
  // that may come back meaning something else.
  for (const allowed of LEVEL_4_APIS) {
    const covers = adminApis.some((route) => route === allowed || route.startsWith(`${allowed}/`));
    assert.ok(covers, `${allowed} is listed at level 4 but matches no route on disk`);
  }
});

test('the level-4 page list contains no stale entries', () => {
  for (const allowed of LEVEL_4_PAGES) {
    const covers = adminPages.some((page) => page === allowed || page.startsWith(`${allowed}/`));
    assert.ok(covers, `${allowed} is listed at level 4 but matches no page on disk`);
  }
});

test('the level-4 grants are exactly the ones intended today', () => {
  // Pinned deliberately. Widening principal access to a district-wide admin route should be
  // a decision someone makes on purpose, and updating this list is the moment to notice.
  //
  // Each of these handlers scopes its own reads to the actor's school; that is what makes
  // the grant safe, and it is the thing to re-check before adding to the list.
  const level4Apis = adminApis.filter((route) => requiredAdminLevel(route) === 4);
  assert.deepEqual(level4Apis, [
    '/api/admin/forms/share',
    '/api/admin/principals',
    '/api/admin/reports',
    '/api/admin/timeline',
    '/api/admin/users/school',
  ]);

  const level4Pages = adminPages.filter((page) => requiredAdminLevel(page) === 4);
  assert.deepEqual(level4Pages, ['/admin/users']);
});

test('the district-wide admin routes all sit at level 5', () => {
  // The inverse assertion: these are the ones that read or mutate across every school, and
  // a regression that dropped one to level 4 would be a real data leak.
  const mustBeSuperAdmin = [
    '/api/admin/goals',
    '/api/admin/health',
    '/api/admin/questions',
    '/api/admin/questions/publish',
    '/api/admin/questions/seed',
    '/api/admin/forms/export',
    '/api/admin/forms/live',
    '/api/admin/forms/migrate-contacts',
    '/api/admin/forms/rollover',
    '/api/admin/schools',
    '/api/admin/schools/[id]',
  ];
  for (const route of mustBeSuperAdmin) {
    assert.equal(requiredAdminLevel(route), 5, `${route} must require level 5`);
  }
});

test('prefix matching does not leak across sibling paths', () => {
  // `/api/admin/users/school` is level 4, but that must not hand over a hypothetical
  // `/api/admin/users` root or a `/api/admin/users/all` sibling.
  assert.equal(requiredAdminLevel('/api/admin/users'), 5);
  assert.equal(requiredAdminLevel('/api/admin/users/all'), 5);
  assert.equal(requiredAdminLevel('/api/admin/users/school'), 4);
  assert.equal(requiredAdminLevel('/api/admin/users/school/nested'), 4);

  // And a name that merely starts with an allowed string is not a prefix match.
  assert.equal(requiredAdminLevel('/api/admin/principals-export'), 5);
  assert.equal(requiredAdminLevel('/admin/users-report'), 5);
});
