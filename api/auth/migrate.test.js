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
let mockGarminLogin = () => Promise.resolve();
let mockGarminExportToken = () => ({ oauth1Token: 'token' });

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
  exports: { hash: (...args) => mockBcryptHash(...args), compare: () => Promise.resolve(true) },
};

const mockGarminClient = {
  login: (...args) => mockGarminLogin(...args),
  exportToken: () => mockGarminExportToken(),
};
require.cache[require.resolve('garmin-connect')] = {
  id: require.resolve('garmin-connect'),
  filename: 'garmin-connect',
  loaded: true,
  exports: { GarminConnect: function () { return mockGarminClient; } },
};

require.cache[require.resolve('../../lib/token-crypto')] = {
  id: require.resolve('../../lib/token-crypto'),
  filename: path.join(libDir, 'token-crypto.js'),
  loaded: true,
  exports: { encryptTokens: () => 'enc:v1:mocked', decryptTokens: (s) => (s ? {} : null) },
};

const handler = require('./migrate');

function makeReq(body = {}) {
  return { method: 'POST', body, headers: {} };
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
  mockGarminLogin = () => Promise.resolve();
  mockGarminExportToken = () => ({ oauth1Token: 'token' });
});

test('rejects non-POST with 405', async () => {
  const res = makeRes();
  await handler({ method: 'GET', body: {}, headers: {} }, res);
  assert.equal(res._status, 405);
});

test('returns 400 when fields missing', async () => {
  const res = makeRes();
  await handler(makeReq({ garminEmail: 'g@test.com' }), res);
  assert.equal(res._status, 400);
});

test('returns 400 when new password too short', async () => {
  const res = makeRes();
  await handler(makeReq({ garminEmail: 'g@test.com', garminPassword: 'gpass', newPassword: 'short' }), res);
  assert.equal(res._status, 400);
});

test('returns 404 when no account found', async () => {
  sqlResults = [Promise.resolve([])];
  const res = makeRes();
  await handler(makeReq({ garminEmail: 'notfound@test.com', garminPassword: 'gpass', newPassword: 'longenough' }), res);
  assert.equal(res._status, 404);
});

test('returns 409 when account already has a password', async () => {
  sqlResults = [Promise.resolve([{ id: 1, password_hash: '$2a$12$existing' }])];
  const res = makeRes();
  await handler(makeReq({ garminEmail: 'user@test.com', garminPassword: 'gpass', newPassword: 'newpassword' }), res);
  assert.equal(res._status, 409);
});

test('returns 401 when Garmin credentials invalid', async () => {
  sqlResults = [Promise.resolve([{ id: 1, password_hash: null }])];
  const err = new Error('Garmin 401 Unauthorized');
  mockGarminLogin = () => Promise.reject(err);
  const res = makeRes();
  await handler(makeReq({ garminEmail: 'user@test.com', garminPassword: 'wrong', newPassword: 'newpassword' }), res);
  assert.equal(res._status, 401);
});

test('returns 200 and sets session on successful migration', async () => {
  // First call: find user → found with no password; second call: update user
  sqlResults = [
    Promise.resolve([{ id: 7, password_hash: null }]),
    Promise.resolve([]),
  ];
  const res = makeRes();
  await handler(makeReq({ garminEmail: 'user@test.com', garminPassword: 'gpass', newPassword: 'newpassword' }), res);
  assert.equal(res._status, 200);
  assert.deepEqual(res._json, { ok: true });
  assert.ok(res._headers['Set-Cookie']);
});
