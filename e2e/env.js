// Single source of truth for the env the app-under-test boots with.
// Test mode is environment-driven only — no production source file is branched.
//
// Defaults target the local docker-compose stack (Postgres + Neon HTTP proxy).
// The DATABASE_URL must contain "localtest.me" so lib/db.js routes queries
// through the local Neon proxy on :4444 (see lib/db.js).
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@db.localtest.me:5432/main';

const SESSION_SECRET = process.env.SESSION_SECRET || 'e2e-test-session-secret';

module.exports = { DATABASE_URL, SESSION_SECRET };
