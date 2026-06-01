const { expect } = require('@playwright/test');

// Must satisfy lib/password.js policy: >=16 chars, upper, lower, digit, special.
const PASSWORD = 'e2e-Password-1234';

// Unique-user-per-test isolation: every call yields an email no other test
// (or parallel worker — note process.pid) will reuse, so the suite needs no
// global database reset.
let seq = 0;
function uniqueEmail() {
  seq += 1;
  return `e2e-${Date.now()}-${process.pid}-${seq}@example.com`;
}

// Unique plaintext API key per call, so seeded api_keys rows (UNIQUE key_hash)
// never collide across parallel workers. Also reused as a guaranteed-unknown
// key for the invalid-key path.
function uniqueApiKey() {
  seq += 1;
  return `e2e-key-${Date.now()}-${process.pid}-${seq}`;
}

// Arrange a registered user via the real API (used to set up login tests).
async function createUser(request, email, password = PASSWORD) {
  const res = await request.post('/api/auth/register', {
    data: { email, password },
  });
  expect(res.ok(), `register API failed with ${res.status()}`).toBeTruthy();
}

// Drive the real login form in the browser.
async function loginViaUI(page, email, password = PASSWORD) {
  await page.goto('/');
  // The form's submit handler is attached by an inline script; wait for the page
  // to settle so the click hits the JS handler rather than a native form submit.
  await page.waitForLoadState('networkidle');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('#login-btn');
}

module.exports = { PASSWORD, uniqueEmail, uniqueApiKey, createUser, loginViaUI };
