'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENC_PREFIX = 'enc:v1:';

function getKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return key;
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext) {
  if (!ciphertext.startsWith(ENC_PREFIX)) {
    // Legacy plaintext JSON — return as-is for transparent migration
    return ciphertext;
  }
  const key = getKey();
  const payload = Buffer.from(ciphertext.slice(ENC_PREFIX.length), 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Serialize and encrypt a token object for DB storage.
 * Requires TOKEN_ENCRYPTION_KEY env var (64 hex chars).
 * @param {object} tokens
 * @returns {string|null} encrypted string with enc:v1: prefix, or null if tokens is falsy
 */
function encryptTokens(tokens) {
  if (!tokens) return null;
  return encrypt(JSON.stringify(tokens));
}

/**
 * Decrypt and deserialize a token value from DB storage.
 * Handles encrypted (enc:v1:) values, legacy plaintext JSON strings, and
 * pre-parsed objects (e.g. from old JSONB reads in tests).
 * @param {string|object|null} stored
 * @returns {object|null}
 */
function decryptTokens(stored) {
  if (!stored) return null;
  if (typeof stored === 'object') return stored;
  return JSON.parse(decrypt(stored));
}

module.exports = { encryptTokens, decryptTokens };
