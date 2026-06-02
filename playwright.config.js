const { defineConfig, devices } = require('@playwright/test');
const { DATABASE_URL, SESSION_SECRET } = require('./e2e/env');

// Dedicated, uncommon port so the harness never collides with (or reuses) an
// unrelated dev server. Override with E2E_PORT if needed.
const PORT = Number(process.env.E2E_PORT) || 39817;
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './e2e',
  // Each test owns a unique user, so tests are safe to run fully in parallel.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Verifies the local DB is reachable and applies migrations before any test.
  globalSetup: require.resolve('./e2e/global-setup.js'),
  use: {
    baseURL: BASE_URL,
    // Keep a trace whenever a test fails — including the first (and only) local
    // attempt, where retries are 0 — so DB+browser failures stay debuggable.
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Boots the real app the way `vercel dev` runs it, in test configuration via
  // env vars only, and waits for the root to respond before tests start.
  webServer: {
    command: `vercel dev --listen ${PORT} --yes`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    // NODE_ENV=development makes lib/db.js use the local connection string and
    // route queries through the local Neon proxy (see lib/db.js).
    env: { ...process.env, NODE_ENV: 'development', DATABASE_URL, SESSION_SECRET },
  },
});
