'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const libDir = path.resolve(__dirname, '..', '..', 'lib');

let mockSqlResult = Promise.resolve([]);
let mockBcryptCompare = () => Promise.resolve(true);

const sqlTagged = () => mockSqlResult;

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
    hash: () => Promise.resolve('$2a$12$hashedpassword'),
    compare: (...args) => mockBcryptCompare(...args),
  },
};

const handler = require('./login');

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
  mockSqlResult = Promise.resolve([]);
  mockBcryptCompare = () => Promise.resolve(true);
});

test('rejects non-POST with 405', async () => {
  const res = makeRes();
  await handler(makeReq('GET'), res);
  assert.equal(res._status, 405);
});

test('returns 400 when credentials missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { email: 'test@example.com' }), res);
  assert.equal(res._status, 400);
});

test('returns 401 when user not found', async () => {
  mockSqlResult = Promise.resolve([]);
  const res = makeRes();
  await handler(makeReq('POST', { email: 'notfound@example.com', password: 'password123' }), res);
  assert.equal(res._status, 401);
  assert.equal(res._json.error, 'Invalid credentials');
});

test('returns 401 with no_password for unmigrated accounts', async () => {
  mockSqlResult = Promise.resolve([{ id: 1, password_hash: null }]);
  const res = makeRes();
  await handler(makeReq('POST', { email: 'old@example.com', password: 'garminpassword' }), res);
  assert.equal(res._status, 401);
  assert.equal(res._json.error, 'no_password');
});

test('returns 401 when password does not match', async () => {
  mockSqlResult = Promise.resolve([{ id: 1, password_hash: '$2a$12$somehash' }]);
  mockBcryptCompare = () => Promise.resolve(false);
  const res = makeRes();
  await handler(makeReq('POST', { email: 'user@example.com', password: 'wrongpassword' }), res);
  assert.equal(res._status, 401);
  assert.equal(res._json.error, 'Invalid credentials');
});

test('returns 200 and sets session on valid credentials', async () => {
  mockSqlResult = Promise.resolve([{ id: 5, password_hash: '$2a$12$somehash' }]);
  mockBcryptCompare = () => Promise.resolve(true);
  const res = makeRes();
  await handler(makeReq('POST', { email: 'user@example.com', password: 'correctpassword' }), res);
  assert.equal(res._status, 200);
  assert.deepEqual(res._json, { ok: true });
  assert.ok(res._headers['Set-Cookie']);
});
