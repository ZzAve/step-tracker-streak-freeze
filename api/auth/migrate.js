'use strict';

const bcrypt = require('bcryptjs');
const GarminConnect = require('garmin-connect').GarminConnect;
const { sql, initializeDatabase } = require('../../lib/db');
const { createSessionCookie } = require('../../lib/session');
const { createRequestLogger } = require('../../lib/request-logger');
const { encryptTokens } = require('../../lib/token-crypto');

/**
 * POST /api/auth/migrate
 *
 * One-time migration for existing Garmin-only users.
 * Verifies Garmin credentials to prove identity, then sets an app password.
 */
module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  try {
    const { garminEmail, garminPassword, newPassword } = req.body || {};
    if (!garminEmail || !garminPassword || !newPassword) {
      res.status(400).json({ error: 'garminEmail, garminPassword, and newPassword are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    await initializeDatabase();

    // Find user by email (which was set from garmin_user_id during migration)
    const userResult = await sql`
      SELECT id, password_hash FROM users WHERE email = ${garminEmail.toLowerCase()}
    `;
    if (userResult.length === 0) {
      res.status(404).json({ error: 'No account found for this email' });
      return;
    }

    const user = userResult[0];
    if (user.password_hash) {
      res.status(409).json({ error: 'Account already has a password. Use forgot-password to reset it.' });
      return;
    }

    // Verify identity via Garmin
    const client = new GarminConnect({ username: garminEmail, password: garminPassword });
    await client.login(garminEmail, garminPassword);
    const tokens = client.exportToken();

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          garmin_user_id = ${garminEmail.toLowerCase()},
          garmin_tokens = ${encryptTokens(tokens)}
      WHERE id = ${user.id}
    `;

    res.setHeader('Set-Cookie', createSessionCookie(user.id));
    res.status(200).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Migrate error');
    if (err.message && (err.message.includes('401') || err.message.includes('credentials'))) {
      res.status(401).json({ error: 'Invalid Garmin credentials' });
    } else {
      res.status(500).json({ error: 'Migration failed' });
    }
    logResponse(res);
  }
};
