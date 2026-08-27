const test = require('node:test');
const assert = require('node:assert');
const { isAllowedNy, geoDecision, readGeo, geoRestrictMode } = require('./geoRestrict');

test('isAllowedNy: US + NY is allowed', () => {
  assert.equal(isAllowedNy({ country: 'US', region: 'NY' }), true);
});

test('isAllowedNy: other US states are not New York', () => {
  assert.equal(isAllowedNy({ country: 'US', region: 'CA' }), false);
  assert.equal(isAllowedNy({ country: 'US', region: 'NJ' }), false);
});

test('isAllowedNy: outside the US is not allowed', () => {
  assert.equal(isAllowedNy({ country: 'CA', region: 'ON' }), false);
  assert.equal(isAllowedNy({ country: 'GB', region: 'ENG' }), false);
});

test('isAllowedNy: missing geo (local dev) is allowed so localhost still works', () => {
  assert.equal(isAllowedNy({ country: '', region: '' }), true);
  assert.equal(isAllowedNy({}), true);
});

test('readGeo: lowercases country/region and leaves city as a display string', () => {
  const geo = readGeo({
    get(name) {
      return {
        'x-vercel-ip-country': 'us',
        'x-vercel-ip-country-region': 'ny',
        'x-vercel-ip-city': 'Brooklyn',
      }[name];
    },
  });
  assert.deepEqual(geo, { country: 'US', region: 'NY', city: 'Brooklyn' });
});

test('geoDecision: off never blocks, log records, deny blocks', () => {
  const outside = { country: 'US', region: 'CA' };
  const inside = { country: 'US', region: 'NY' };
  assert.equal(geoDecision(outside, 'off'), 'allow');
  assert.equal(geoDecision(outside, 'log'), 'log');
  assert.equal(geoDecision(outside, 'deny'), 'deny');
  assert.equal(geoDecision(inside, 'deny'), 'allow');
});

test('geoRestrictMode: env aliases', () => {
  assert.equal(geoRestrictMode({ GEO_RESTRICT: 'deny' }), 'deny');
  assert.equal(geoRestrictMode({ GEO_RESTRICT: '1' }), 'deny');
  assert.equal(geoRestrictMode({ GEO_RESTRICT: 'log' }), 'off');
  assert.equal(geoRestrictMode({ GEO_RESTRICT: '' }), 'off');
  assert.equal(geoRestrictMode({}), 'off');
});

test('Brooklyn is still New York State — city must not be the allow condition', () => {
  // This is the trap in matching geo_city == "New York". A principal at a Brooklyn
  // campus is in NY and must pass. City is informational only.
  const brooklyn = { country: 'US', region: 'NY', city: 'Brooklyn' };
  assert.equal(isAllowedNy(brooklyn), true);
  assert.equal(geoDecision(brooklyn, 'deny'), 'allow');
});
