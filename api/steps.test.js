'use strict';

const { test, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Mock dependencies via require cache before requiring the handler
// ---------------------------------------------------------------------------

let mockGetUserFromSession = () => null;
let mockSyncIfNeeded = () => Promise.resolve(false);
let mockFetchStepsAndStreak = () => Promise.resolve({
  allSteps: [],
  streak: {
    current_streak: 0, longest_streak: 0, freeze_count: 0,
    days_since_last_freeze_earned: 0, freezes_used: [], day_annotations: [],
  },
});

// sql mock: needs to work as both a tagged template and a regular function
let mockSqlResult = Promise.resolve([]);
const sqlTagged = (...args) => mockSqlResult;
// Support fire-and-forget .catch() on upsert
Object.defineProperty(sqlTagged, 'catch', {
  value: () => ({ catch: () => {} }),
  writable: true,
});

const libDir = path.resolve(__dirname, '..', 'lib');

require.cache[require.resolve('../lib/db')] = {
  id: require.resolve('../lib/db'),
  filename: path.join(libDir, 'db.js'),
  loaded: true,
  exports: {
    sql: sqlTagged,
    initializeDatabase: () => Promise.resolve(),
  },
};

require.cache[require.resolve('../lib/session')] = {
  id: require.resolve('../lib/session'),
  filename: path.join(libDir, 'session.js'),
  loaded: true,
  exports: {
    getUserFromSession: (...args) => mockGetUserFromSession(...args),
  },
};

require.cache[require.resolve('../lib/sync')] = {
  id: require.resolve('../lib/sync'),
  filename: path.join(libDir, 'sync.js'),
  loaded: true,
  exports: {
    syncIfNeeded: (...args) => mockSyncIfNeeded(...args),
  },
};

require.cache[require.resolve('../lib/steps')] = {
  id: require.resolve('../lib/steps'),
  filename: path.join(libDir, 'steps.js'),
  loaded: true,
  exports: {
    fetchStepsAndStreak: (...args) => mockFetchStepsAndStreak(...args),
  },
};

require.cache[require.resolve('../lib/request-logger')] = {
  id: require.resolve('../lib/request-logger'),
  filename: path.join(libDir, 'request-logger.js'),
  loaded: true,
  exports: {
    createRequestLogger: () => ({
      log: { debug: () => {}, error: () => {} },
      logResponse: () => {},
    }),
  },
};

const handler = require('./steps');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(method = 'GET') {
  return { method, headers: {} };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    _ended: false,
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
    end() { res._ended = true; return res; },
  };
  return res;
}

const DEFAULT_USER = { id: 'user-1', garmin_user_id: 'garmin@test.com', garmin_tokens: '{}', last_synced_at: '2026-03-25T10:00:00Z' };
const DEFAULT_STREAK = {
  current_streak: 0, longest_streak: 0, freeze_count: 0,
  days_since_last_freeze_earned: 0, freezes_used: [], day_annotations: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGetUserFromSession = () => null;
  mockSyncIfNeeded = () => Promise.resolve(false);
  mockFetchStepsAndStreak = () => Promise.resolve({ allSteps: [], streak: DEFAULT_STREAK });
  mockSqlResult = Promise.resolve([]);
});

test('rejects non-GET requests with 405', async () => {
  const res = makeRes();
  await handler(makeReq('POST'), res);
  assert.equal(res._status, 405);
  assert.equal(res._headers['Allow'], 'GET');
});

test('returns 401 when no session', async () => {
  mockGetUserFromSession = () => null;
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res._status, 401);
  assert.deepEqual(res._json, { error: 'Unauthorized' });
});

test('returns 401 when user not found in DB', async () => {
  mockGetUserFromSession = () => 'user-1';
  mockSqlResult = Promise.resolve([]);
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res._status, 401);
  assert.deepEqual(res._json, { error: 'User not found' });
});

test('returns 400 when sync fails with NO_TOKENS', async () => {
  mockGetUserFromSession = () => 'user-1';
  mockSqlResult = Promise.resolve([DEFAULT_USER]);
  const err = new Error('No tokens');
  err.code = 'NO_TOKENS';
  mockSyncIfNeeded = () => Promise.reject(err);
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res._status, 400);
  assert.deepEqual(res._json, { error: 'No Garmin tokens found for user' });
});

test('returns 401 when sync fails with Garmin 401', async () => {
  mockGetUserFromSession = () => 'user-1';
  mockSqlResult = Promise.resolve([DEFAULT_USER]);
  mockSyncIfNeeded = () => Promise.reject(new Error('Garmin API returned 401 Unauthorized'));
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res._status, 401);
  assert.deepEqual(res._json, { error: 'Garmin token expired, please log in again' });
});

test('returns 200 with correct response shape on success', async () => {
  mockGetUserFromSession = () => 'user-1';
  mockSqlResult = Promise.resolve([DEFAULT_USER]);
  mockSyncIfNeeded = () => Promise.resolve(true);
  mockFetchStepsAndStreak = () => Promise.resolve({
    allSteps: [
      { date: '2026-03-24', steps: 12000, goal_met: true },
      { date: '2026-03-25', steps: 8000, goal_met: false },
    ],
    streak: {
      current_streak: 5, longest_streak: 10, freeze_count: 1,
      days_since_last_freeze_earned: 3,
      freezes_used: [{ date: '2026-03-20' }],
      day_annotations: [],
    },
  });

  const res = makeRes();
  await handler(makeReq(), res);

  assert.equal(res._status, 200);
  assert.equal(res._json.user_email, 'garmin@test.com');
  assert.equal(res._json.streak.current, 5);
  assert.equal(res._json.streak.longest, 10);
  assert.equal(res._json.streak.freeze_count, 1);
  assert.equal(res._json.streak.days_toward_next_freeze, 3);
  assert.deepEqual(res._json.streak.freezes_used, ['2026-03-20']);
  assert.equal(res._json.steps.length, 2);
  assert.equal(res._json.last_synced_at, '2026-03-25T10:00:00Z');
});

test('calls fetchStepsAndStreak with the correct user id', async () => {
  let capturedUserId = null;
  mockGetUserFromSession = () => 'user-42';
  mockSqlResult = Promise.resolve([{ ...DEFAULT_USER, id: 'user-42' }]);
  mockSyncIfNeeded = () => Promise.resolve(false);
  mockFetchStepsAndStreak = (userId) => {
    capturedUserId = userId;
    return Promise.resolve({ allSteps: [], streak: DEFAULT_STREAK });
  };

  const res = makeRes();
  await handler(makeReq(), res);

  assert.equal(capturedUserId, 'user-42');
  assert.equal(res._status, 200);
});
