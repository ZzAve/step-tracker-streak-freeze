'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Mutable, query-aware sql mock so handler tests can shape DB responses per-test.
let mockSql = () => Promise.resolve([]);
const sqlTagged = (...args) => mockSql(...args);

const libDir = path.resolve(__dirname, '..', 'lib');

require.cache[require.resolve('../lib/db')] = {
  id: require.resolve('../lib/db'),
  filename: path.join(libDir, 'db.js'),
  loaded: true,
  exports: { sql: sqlTagged, initializeDatabase: () => Promise.resolve() },
};

// Mock sync only — lib/steps and lib/streak run for real so the streak
// calculation (incl. the "today counts" extension) is exercised end-to-end.
require.cache[require.resolve('../lib/sync')] = {
  id: require.resolve('../lib/sync'),
  filename: path.join(libDir, 'sync.js'),
  loaded: true,
  exports: {
    syncIfNeeded: () => Promise.resolve(false),
    todayStr: () => localDateStr(new Date()),
    SYNC_COOLDOWN_MS: 3600000,
  },
};

require.cache[require.resolve('../lib/request-logger')] = {
  id: require.resolve('../lib/request-logger'),
  filename: path.join(libDir, 'request-logger.js'),
  loaded: true,
  exports: {
    createRequestLogger: () => ({
      log: { debug: () => {}, warn: () => {}, error: () => {} },
      logResponse: () => {},
    }),
  },
};

const handler = require('./widget');
const { computeCacheMeta } = handler;

const SYNC_COOLDOWN_MS = 3600000; // 1 hour

beforeEach(() => {
  mockSql = () => Promise.resolve([]);
});

test('lastUpdatedAt is ISO 8601 of last_synced_at when user has synced', () => {
  const lastSyncedAt = '2026-03-25T10:00:00Z';
  const { lastUpdatedAt } = computeCacheMeta(lastSyncedAt, SYNC_COOLDOWN_MS);
  assert.equal(lastUpdatedAt, '2026-03-25T10:00:00.000Z');
});

test('refreshAfter is ISO 8601 of last_synced_at + cooldown when user has synced', () => {
  const lastSyncedAt = '2026-03-25T10:00:00Z';
  const { refreshAfter } = computeCacheMeta(lastSyncedAt, SYNC_COOLDOWN_MS);
  assert.equal(refreshAfter, '2026-03-25T11:00:00.000Z');
});

test('lastUpdatedAt is null when user has never synced', () => {
  const { lastUpdatedAt } = computeCacheMeta(null, SYNC_COOLDOWN_MS);
  assert.equal(lastUpdatedAt, null);
});

test('refreshAfter is ~current time as ISO 8601 when user has never synced', () => {
  const before = Date.now();
  const { refreshAfter } = computeCacheMeta(null, SYNC_COOLDOWN_MS);
  const after = Date.now();
  const parsed = new Date(refreshAfter).getTime();
  assert.ok(parsed >= before && parsed <= after,
    `refreshAfter (${refreshAfter}) should be ~current time`);
});

test('handles Date object for last_synced_at', () => {
  const lastSyncedAt = new Date('2026-03-25T10:00:00Z');
  const { lastUpdatedAt, refreshAfter } = computeCacheMeta(lastSyncedAt, SYNC_COOLDOWN_MS);
  assert.equal(lastUpdatedAt, '2026-03-25T10:00:00.000Z');
  assert.equal(refreshAfter, '2026-03-25T11:00:00.000Z');
});

// ---------------------------------------------------------------------------
// Handler regression: today is counted in the streak via the /widget path
// ---------------------------------------------------------------------------

function makeReq(key = 'valid-key') {
  return { method: 'GET', query: { key } };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
    end() { return res; },
  };
  return res;
}

test('streak includes today when today already meets the goal (no persisted streak)', async () => {
  const dayAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d); };

  // Two prior consecutive goal-met days, plus today already over the goal.
  const stepRows = [
    { date: dayAgo(2), steps: 11000, goal_met: true },
    { date: dayAgo(1), steps: 12000, goal_met: true },
    { date: localDateStr(new Date()), steps: 10500, goal_met: true },
  ];

  const keyRow = {
    key_id: 'key-1',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    id: 'user-1',
    garmin_tokens: null,
    last_synced_at: '2026-03-25T10:00:00Z',
  };

  mockSql = (strings) => {
    const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
    if (q.includes('daily_steps')) return Promise.resolve(stepRows);
    if (q.includes('FROM streaks')) return Promise.resolve([]); // no persisted streak → full recalc
    if (q.includes('last_used_at')) return Promise.resolve([]); // UPDATE api_keys
    if (q.includes('api_keys')) return Promise.resolve([keyRow]); // auth lookup
    return Promise.resolve([]);
  };

  const res = makeRes();
  await handler(makeReq(), res);

  assert.equal(res._status, 200);
  // Two past goal-met days = streak of 2; today meeting the goal extends it to 3.
  assert.equal(res._json.streak, 3);
  assert.equal(res._json.today_steps, 10500);
  // Today's weekly cell reflects the met goal.
  assert.equal(res._json.week[res._json.week.length - 1].status, 'goal_met');
});
