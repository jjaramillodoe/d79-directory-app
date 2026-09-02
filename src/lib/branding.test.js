const test = require('node:test');
const assert = require('node:assert/strict');
const { APP_NAME, APP_TITLE, ORG_NAME } = require('./branding');

test('product name is the official plan title', () => {
  assert.equal(APP_NAME, 'Consolidated School & Youth Development Plan');
  assert.equal(ORG_NAME, 'District 79');
  assert.equal(APP_TITLE, `${ORG_NAME} · ${APP_NAME}`);
});
