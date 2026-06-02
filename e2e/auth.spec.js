const { test, expect } = require('@playwright/test');
const { PASSWORD, uniqueEmail, createUser, loginViaUI } = require('./helpers');

test.describe('authentication', () => {
  test('register: a fresh account reaches the signed-in dashboard', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    // Wait for the submit button (the inline script attaches the form handler
    // synchronously before the page settles; this avoids a native submit).
    await page.locator('#reg-btn').waitFor();
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', PASSWORD);
    await page.fill('#reg-confirm', PASSWORD);
    await page.click('#reg-btn');

    // register.html redirects to / on success; the session cookie lands us on the dashboard.
    await expect(page).toHaveURL('/');
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#btn-logout')).toBeVisible();
  });

  test('login: valid credentials render the signed-in dashboard', async ({ page, request }) => {
    const email = uniqueEmail();
    await createUser(request, email);

    await loginViaUI(page, email);

    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();
  });

  test('login: invalid credentials are rejected with a surfaced error', async ({ page, request }) => {
    const email = uniqueEmail();
    await createUser(request, email);

    await loginViaUI(page, email, 'wrong-password');

    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-error')).not.toHaveText('');
    await expect(page.locator('#dashboard')).toBeHidden();
    await expect(page.locator('#login-screen')).toBeVisible();
  });

  test('logout: ends the session and protects the dashboard', async ({ page, request }) => {
    const email = uniqueEmail();
    await createUser(request, email);
    await loginViaUI(page, email);
    await expect(page.locator('#dashboard')).toBeVisible();

    // Logout opens a confirmation modal; confirm it to end the session.
    await page.click('#btn-logout');
    await page.click('#modal-confirm-logout');

    // Logout posts to /api/auth/logout then reloads; checkAuth() sees 401 and shows login.
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#dashboard')).toBeHidden();

    // The protected resource now requires signing in again.
    const res = await page.request.get('/api/steps');
    expect(res.status()).toBe(401);
  });
});
