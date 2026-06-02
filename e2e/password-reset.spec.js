const { test, expect } = require('@playwright/test');
const { PASSWORD, uniqueEmail, uniqueToken, createUser } = require('./helpers');
const { seedResetToken, countResetTokens } = require('./seed');

// A distinct strong password for the reset, satisfying lib/password.js /
// password-validation.js (>=16 chars, upper, lower, digit, special '-').
const NEW_PASSWORD = 'e2e-NewPassword-5678';

// Drive the real forgot-password form in the browser.
async function requestResetViaUI(page, email) {
  await page.goto('/forgot-password');
  await page.waitForLoadState('networkidle');
  await page.fill('#fp-email', email);
  await page.click('#fp-btn');
}

// Drive the real reset-password form in the browser (token from the URL query).
async function submitResetViaUI(page, token, newPassword = NEW_PASSWORD) {
  await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
  await page.waitForLoadState('networkidle');
  await page.fill('#rp-password', newPassword);
  await page.fill('#rp-confirm', newPassword);
  await page.click('#rp-btn');
}

// Assert credentials via the real login endpoint: 200 == accepted, 401 == rejected.
async function loginStatus(request, email, password) {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  return res.status();
}

test.describe('password reset flow', () => {
  // --- Request side: real forgot-password.html / POST /api/auth/forgot-password ---

  test('a reset request for a registered email succeeds and creates one unused token', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await createUser(request, email);

    await requestResetViaUI(page, email);

    // Generic acknowledgement, identical to the unregistered case below.
    await expect(page.locator('#success-msg')).toBeVisible();
    expect(await countResetTokens(email)).toBe(1);
  });

  test('a reset request for an unregistered email gives the same acknowledgement and creates no token', async ({
    page,
  }) => {
    const email = uniqueEmail(); // never registered

    await requestResetViaUI(page, email);

    // Anti-enumeration: same generic success, but no token row exists.
    await expect(page.locator('#success-msg')).toBeVisible();
    expect(await countResetTokens(email)).toBe(0);
  });

  // --- Execution side: real reset-password.html / POST /api/auth/reset-password ---

  test('a valid token resets the password: new password logs in, old is rejected', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await createUser(request, email);
    const token = uniqueToken();
    await seedResetToken(email, token);

    await submitResetViaUI(page, token);
    await expect(page.locator('#success-screen')).toBeVisible();

    // The end-to-end proof: credentials actually changed.
    expect(await loginStatus(request, email, NEW_PASSWORD)).toBe(200);
    expect(await loginStatus(request, email, PASSWORD)).toBe(401);
  });

  test('an expired token is rejected and leaves credentials unchanged', async ({ page, request }) => {
    const email = uniqueEmail();
    await createUser(request, email);
    const token = uniqueToken();
    await seedResetToken(email, token, { expiresInMs: -60 * 60 * 1000 }); // expired 1h ago

    await submitResetViaUI(page, token);
    await expect(page.locator('#invalid-screen')).toBeVisible();

    expect(await loginStatus(request, email, PASSWORD)).toBe(200);
    expect(await loginStatus(request, email, NEW_PASSWORD)).toBe(401);
  });

  test('an already-used token is rejected and leaves credentials unchanged', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await createUser(request, email);
    const token = uniqueToken();
    await seedResetToken(email, token, { usedAt: new Date().toISOString() });

    await submitResetViaUI(page, token);
    await expect(page.locator('#invalid-screen')).toBeVisible();

    expect(await loginStatus(request, email, PASSWORD)).toBe(200);
    expect(await loginStatus(request, email, NEW_PASSWORD)).toBe(401);
  });

  test('an unknown token is rejected and leaves credentials unchanged', async ({ page, request }) => {
    const email = uniqueEmail();
    await createUser(request, email);
    const token = uniqueToken(); // never seeded

    await submitResetViaUI(page, token);
    await expect(page.locator('#invalid-screen')).toBeVisible();

    expect(await loginStatus(request, email, PASSWORD)).toBe(200);
    expect(await loginStatus(request, email, NEW_PASSWORD)).toBe(401);
  });
});
