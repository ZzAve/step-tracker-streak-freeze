'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('./password');

const VALID = 'Secur3P@ssword!Test';

test('accepts a valid password', () => {
  const result = validatePassword(VALID);
  assert.equal(result.valid, true);
  assert.equal(result.error, null);
});

test('rejects password shorter than 16 characters', () => {
  const result = validatePassword('Short1@x');
  assert.equal(result.valid, false);
  assert.match(result.error, /16/);
});

test('rejects password longer than 128 characters', () => {
  const longPw = 'Aa1!'.repeat(33);
  const result = validatePassword(longPw);
  assert.equal(result.valid, false);
  assert.match(result.error, /128/);
});

test('rejects password with no uppercase letter', () => {
  const result = validatePassword('secur3p@ssword!test');
  assert.equal(result.valid, false);
  assert.match(result.error, /uppercase/i);
});

test('rejects password with no lowercase letter', () => {
  const result = validatePassword('SECUR3P@SSWORD!TEST');
  assert.equal(result.valid, false);
  assert.match(result.error, /lowercase/i);
});

test('rejects password with no digit', () => {
  const result = validatePassword('SecurP@ssword!Test');
  assert.equal(result.valid, false);
  assert.match(result.error, /digit/i);
});

test('rejects password with no special character', () => {
  const result = validatePassword('Secur3Passw0rdTest');
  assert.equal(result.valid, false);
  assert.match(result.error, /special/i);
});

test('accepts password with exactly 16 characters meeting all rules', () => {
  const result = validatePassword('Abcdef1@ghijklmn');
  assert.equal(result.valid, true);
});

test('accepts password with exactly 128 characters', () => {
  const pw = 'Aa1!' + 'a'.repeat(124);
  assert.equal(pw.length, 128);
  const result = validatePassword(pw);
  assert.equal(result.valid, true);
});
