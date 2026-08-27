/**
 * New York State geo gate for District 79.
 *
 * Vercel sets these on every request that hits their network:
 *   x-vercel-ip-country         ISO 3166-1 alpha-2  (US)
 *   x-vercel-ip-country-region  ISO 3166-2 region   (NY)
 *   x-vercel-ip-city            city name           (unreliable for this app)
 *
 * City matching is deliberately not used. District 79 schools sit in every
 * borough; an IP in Brooklyn, Queens, the Bronx, or Staten Island geolocates
 * to that borough name, not "New York". Restricting to geo_city == "New York"
 * would lock out most of the district. The state code `NY` is the right grain.
 *
 * Missing headers (local `next start`, non-Vercel hosts) are treated as
 * allowed so development is not blocked. Production enforcement belongs on
 * Vercel, where the headers are actually present.
 */

const ALLOWED_COUNTRY = 'US';
const ALLOWED_REGION = 'NY';

function normalize(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function readGeo(headers) {
  const get = (name) => {
    if (!headers) return '';
    if (typeof headers.get === 'function') return headers.get(name) || '';
    return headers[name] || headers[name.toLowerCase()] || '';
  };
  return {
    country: normalize(get('x-vercel-ip-country')),
    region: normalize(get('x-vercel-ip-country-region')),
    city: String(get('x-vercel-ip-city') || '').trim(),
  };
}

function isAllowedNy(geo) {
  if (!geo?.country && !geo?.region) return true;
  return geo.country === ALLOWED_COUNTRY && geo.region === ALLOWED_REGION;
}

/**
 * @param {'off'|'log'|'deny'} mode
 * @returns {'allow'|'log'|'deny'}
 */
function geoDecision(geo, mode = 'off') {
  const enabled = mode === 'log' || mode === 'deny';
  if (!enabled) return 'allow';
  if (isAllowedNy(geo)) return 'allow';
  return mode === 'deny' ? 'deny' : 'log';
}

/**
 * @param {{ GEO_RESTRICT?: string }} [env]
 */
function geoRestrictMode(env = process.env) {
  const raw = String(env.GEO_RESTRICT || 'off').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'deny') return 'deny';
  return 'off';
}

module.exports = {
  ALLOWED_COUNTRY,
  ALLOWED_REGION,
  readGeo,
  isAllowedNy,
  geoDecision,
  geoRestrictMode,
};
