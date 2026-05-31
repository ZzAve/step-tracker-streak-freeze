'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const libDir = path.resolve(__dirname, '..', '..', 'lib');

// sql mock supports sequenced results per call
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

require.cache[require.resolve('../../lib/session')] = {
  id: require.resolve('../../lib/session'),
  filename: path.join(libDir, 'session.js'),
  loaded: true,
  exports: { createSessionCookie: () => 'session=test' },
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

const handler = require('./register');

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

test('returns 400 when email missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { password: 'password123' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /required/i);
});

test('returns 400 when password too short', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { email: 'test@example.com', password: 'short' }), res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /8/);
});

test('returns 200 without session cookie when email already registered', async () => {
  sqlResults = [Promise.resolve([{ id: 1 }])];
  const res = makeRes();
  await handler(makeReq('POST', { email: 'test@example.com', password: 'password123' }), res);
  assert.equal(res._status, 200);
  assert.deepEqual(res._json, { ok: true });
  assert.equal(res._headers['Set-Cookie'], undefined);
});

test('returns 201 and sets session cookie on success', async () => {
  // First call: check existing → empty; second call: insert → new user
  sqlResults = [Promise.resolve([]), Promise.resolve([{ id: 42 }])];
  const res = makeRes();
  await handler(makeReq('POST', { email: 'new@example.com', password: 'securepassword' }), res);
  assert.equal(res._status, 201);
  assert.deepEqual(res._json, { ok: true });
  assert.ok(res._headers['Set-Cookie']);
});
