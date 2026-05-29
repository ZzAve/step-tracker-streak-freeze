'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');

// Must be set before the module is loaded (32 bytes = 64 hex chars of 0xab)
process.env.TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);

const { encryptTokens, decryptTokens } = require('./token-crypto');

const SAMPLE_TOKENS = {
  oauth1: { token_key: 'key123', token_secret: 'secret456' },
  oauth2: { access_token: 'at', refresh_token: 'rt', expires_at: 9999999999 },
};

test('encryptTokens produces enc:v1: prefix', () => {
  const result = encryptTokens(SAMPLE_TOKENS);
  assert.ok(result.startsWith('enc:v1:'), `expected enc:v1: prefix, got: ${result.slice(0, 20)}`);
});

test('encryptTokens + decryptTokens round-trips correctly', () => {
  const encrypted = encryptTokens(SAMPLE_TOKENS);
  const decrypted = decryptTokens(encrypted);
  assert.deepEqual(decrypted, SAMPLE_TOKENS);
});

test('two encryptions of same token produce different ciphertexts (random IV)', () => {
  const a = encryptTokens(SAMPLE_TOKENS);
  const b = encryptTokens(SAMPLE_TOKENS);
  assert.notEqual(a, b);
});

test('decryptTokens handles legacy plaintext JSON string', () => {
  const legacy = JSON.stringify(SAMPLE_TOKENS);
  const result = decryptTokens(legacy);
  assert.deepEqual(result, SAMPLE_TOKENS);
});

test('decryptTokens handles null', () => {
  assert.equal(decryptTokens(null), null);
});

test('decryptTokens handles undefined', () => {
  assert.equal(decryptTokens(undefined), null);
});

test('decryptTokens handles already-parsed object (legacy JSONB path in tests)', () => {
  const result = decryptTokens(SAMPLE_TOKENS);
  assert.deepEqual(result, SAMPLE_TOKENS);
});

test('encryptTokens throws when TOKEN_ENCRYPTION_KEY is missing', () => {
  const saved = process.env.TOKEN_ENCRYPTION_KEY;
  delete process.env.TOKEN_ENCRYPTION_KEY;
  assert.throws(() => encryptTokens(SAMPLE_TOKENS), /TOKEN_ENCRYPTION_KEY/);
  process.env.TOKEN_ENCRYPTION_KEY = saved;
});

test('decryptTokens throws when TOKEN_ENCRYPTION_KEY is missing for encrypted value', () => {
  const encrypted = encryptTokens(SAMPLE_TOKENS);
  const saved = process.env.TOKEN_ENCRYPTION_KEY;
  delete process.env.TOKEN_ENCRYPTION_KEY;
  assert.throws(() => decryptTokens(encrypted), /TOKEN_ENCRYPTION_KEY/);
  process.env.TOKEN_ENCRYPTION_KEY = saved;
});
