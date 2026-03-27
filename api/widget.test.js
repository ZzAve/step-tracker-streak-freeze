'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeCacheMeta } = require('./widget');

const SYNC_COOLDOWN_MS = 3600000; // 1 hour

test('lastUpdatedAt is epoch seconds of last_synced_at when user has synced', () => {
  const lastSyncedAt = '2026-03-25T10:00:00Z';
  const { lastUpdatedAt } = computeCacheMeta(lastSyncedAt, SYNC_COOLDOWN_MS);
  const expected = Math.floor(new Date(lastSyncedAt).getTime() / 1000);
  assert.equal(lastUpdatedAt, expected);
});

test('refreshAfter is last_synced_at + SYNC_COOLDOWN_MS in epoch seconds when user has synced', () => {
  const lastSyncedAt = '2026-03-25T10:00:00Z';
  const { refreshAfter } = computeCacheMeta(lastSyncedAt, SYNC_COOLDOWN_MS);
  const expected = Math.floor((new Date(lastSyncedAt).getTime() + SYNC_COOLDOWN_MS) / 1000);
  assert.equal(refreshAfter, expected);
});

test('lastUpdatedAt is 0 when user has never synced', () => {
  const { lastUpdatedAt } = computeCacheMeta(null, SYNC_COOLDOWN_MS);
  assert.equal(lastUpdatedAt, 0);
});

test('refreshAfter is current server time when user has never synced', () => {
  const before = Math.floor(Date.now() / 1000);
  const { refreshAfter } = computeCacheMeta(null, SYNC_COOLDOWN_MS);
  const after = Math.floor(Date.now() / 1000);
  assert.ok(refreshAfter >= before && refreshAfter <= after,
    `refreshAfter (${refreshAfter}) should be ~current time (${before}-${after})`);
});

test('handles Date object for last_synced_at', () => {
  const lastSyncedAt = new Date('2026-03-25T10:00:00Z');
  const { lastUpdatedAt, refreshAfter } = computeCacheMeta(lastSyncedAt, SYNC_COOLDOWN_MS);
  assert.equal(lastUpdatedAt, Math.floor(lastSyncedAt.getTime() / 1000));
  assert.equal(refreshAfter, Math.floor((lastSyncedAt.getTime() + SYNC_COOLDOWN_MS) / 1000));
});
