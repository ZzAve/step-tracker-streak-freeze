'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeCacheMeta } = require('./widget');

const SYNC_COOLDOWN_MS = 3600000; // 1 hour

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
