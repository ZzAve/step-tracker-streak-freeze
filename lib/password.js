'use strict';

const MIN_LENGTH = 16;
const MAX_LENGTH = 128;

function validatePassword(password) {
  if (password.length < MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_LENGTH} characters` };
  }
  if (password.length > MAX_LENGTH) {
    return { valid: false, error: `Password must be no more than ${MAX_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one digit' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*)' };
  }
  return { valid: true, error: null };
}

module.exports = { validatePassword };
