#!/usr/bin/env node
/**
 * Reports the initial JavaScript each prerendered route loads, and flags whether the heavy
 * client libraries are present in that initial payload.
 *
 * Next 16's Turbopack build does not print a "First Load JS" column and writes no
 * `app-build-manifest.json`, so the numbers come from the `<script src>` tags in the
 * prerendered HTML — which is what the browser actually fetches before hydration.
 *
 * Usage: node scripts/measure-initial-js.js [route ...]
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', '.next', 'server', 'app');
const STATIC_DIR = path.join(__dirname, '..', '.next', 'static');

// Fingerprints chosen to survive minification: string literals the bundlers keep, rather
// than identifiers they would mangle.
//
// Deliberately excludes `ag-theme-alpine`: that is the CSS class the goals page puts on its
// own wrapper div, so it appears in the page chunk whether or not the library is bundled.
// Using it produced a false positive that made a working split look broken.
const LIBRARY_FINGERPRINTS = {
  recharts: ['recharts-wrapper', 'RechartsWrapper', 'recharts-surface'],
  'ag-grid': ['ag-root-wrapper', 'GridCoreCreator', 'ag-header-cell'],
  jspdf: ['jsPDF', 'getFontSize'],
  html2canvas: ['html2canvas'],
};

function scriptsFor(html) {
  const srcs = [];
  const re = /<script[^>]+src="([^"]+)"/g;
  let match;
  while ((match = re.exec(html))) srcs.push(match[1]);
  return srcs;
}

function localPath(src) {
  const marker = '/_next/static/';
  const index = src.indexOf(marker);
  if (index === -1) return null;
  return path.join(STATIC_DIR, src.slice(index + marker.length).split('?')[0]);
}

function measure(route) {
  const file = path.join(APP_DIR, `${route}.html`);
  if (!fs.existsSync(file)) return { route, missing: true };

  const html = fs.readFileSync(file, 'utf8');
  const files = scriptsFor(html)
    .map(localPath)
    .filter((f) => f && fs.existsSync(f));

  let bytes = 0;
  const found = new Set();

  for (const f of files) {
    bytes += fs.statSync(f).size;
    const content = fs.readFileSync(f, 'utf8');
    for (const [lib, marks] of Object.entries(LIBRARY_FINGERPRINTS)) {
      if (marks.some((m) => content.includes(m))) found.add(lib);
    }
  }

  return { route, count: files.length, bytes, libs: [...found].sort() };
}

const routes = process.argv.slice(2);
if (routes.length === 0) {
  console.error('usage: node scripts/measure-initial-js.js <route> [route ...]');
  process.exit(1);
}

for (const route of routes) {
  const r = measure(route);
  if (r.missing) {
    console.log(`${route.padEnd(22)} (not prerendered)`);
    continue;
  }
  const kb = `${(r.bytes / 1024).toFixed(0)} KB`;
  const libs = r.libs.length ? r.libs.join(', ') : 'none';
  console.log(
    `${route.padEnd(22)} ${kb.padStart(9)}  ${String(r.count).padStart(3)} files  heavy libs: ${libs}`
  );
}
