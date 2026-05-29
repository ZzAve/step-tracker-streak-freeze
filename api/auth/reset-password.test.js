'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('node:path');

const libDir = path.resolve(__dirname, '..', '..', 'lib');

const TEST_TOKEN = 'test-reset-token-abcdef1234567890';
const TEST_TOKEN_HASH = crypto.createHash('sha256').update(TEST_TOKEN).digest('hex');

let sqlResults = [];
let sqlCallIdx = 0;
const sqlTagged = () => {
  const result = sqlResults[sqlCallIdx] ?? Promise.resolve([]);
  sqlCallIdx++;
  return result;
};

let mockBcryptHash = () => Promise.resolve('$2a$12$hashedpassword');

require.cache[require.resolve('../../lib/db')] = {
  id: require.resolve('../../lib/db'),
  filename: path.join(libDir, 'db.js'),
  loaded: true,
  exports: { sql: sqlTagged, initializeDatabase: () => Promise.resolve() },
};

require.cache[require.resolve('../../lib/request-logger')] = {
  id: require.resolve('../../lib/request-logger'),
  filename: path.join(libDir, 'request-logger.js'),
  loaded: true,
  exports: {
    createRequestLogger: () => ({
      log: { error: () => {}, warn: () => {} },
      logResponse: () => {},
    }),
  },
};

require.cache[require.resolve('bcryptjs')] = {
  id: require.resolve('bcryptjs'),
  filename: 'bcryptjs',
  loaded: true,
  exports: {
    hash: (...args) => mockBcryptHash(...args),
    compare: () => Promise.resolve(true),
  },
};

const handler = require('./reset-password');

const VALID_PASSWORD = 'Secur3P@ssword!Test';

function makeReq(method = 'POST', body = {}) {
  return { method, body, headers: {} };
}

function makeRes() {
  const res = {
    _status: null, _json: null, _headers: {},
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
    end() { return res; },
  };
  return res;
}

beforeEach(() => {
  sqlResults = [];
  sqlCallIdx = 0;
  mockBcryptHash = () => Promise.resolve('$2a$12$hashedpassword');
});

test('rejects non-POST with 405', async () => {
  const res = makeRes();
  await handler(makeReq('GET'), res);
  assert.equal(res._status, 405);
});

test('returns 400 when token missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { password: VALID_PASSWORD }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /required/i);
});

test('returns 400 when password missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /required/i);
});

test('returns 400 when password too short', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: 'Short1@x' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /16/);
});

test('returns 400 when password too long', async () => {
  const longPw = 'A'.repeat(64) + 'a'.repeat(32) + '1@' + 'x'.repeat(31);
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: longPw }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /128/);
});

test('returns 400 when password has no uppercase letter', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: 'secur3p@ssword!test' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /uppercase/i);
});

test('returns 400 when password has no lowercase letter', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: 'SECUR3P@SSWORD!TEST' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /lowercase/i);
});

test('returns 400 when password has no digit', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: 'SecurP@ssword!Test' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /digit/i);
});

test('returns 400 when password has no special character', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: 'Secur3Passw0rdTest' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /special/i);
});

test('returns 400 when token is invalid or expired', async () => {
  sqlResults = [Promise.resolve([])];
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: VALID_PASSWORD }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /invalid or expired/i);
});

test('returns 200 on successful password reset', async () => {
  sqlResults = [
    Promise.resolve([{ id: 1, user_id: 42 }]),
    Promise.resolve([]),
    Promise.resolve([]),
  ];
  const res = makeRes();
  await handler(makeReq('POST', { token: TEST_TOKEN, password: VALID_PASSWORD }), res);
  assert.equal(res._status, 200);
  assert.deepEqual(res._json, { ok: true });
});
