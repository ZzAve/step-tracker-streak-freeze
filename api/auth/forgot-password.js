'use strict';

const crypto = require('crypto');
const { sql, initializeDatabase } = require('../../lib/db');
const { sendPasswordResetEmail } = require('../../lib/email');
const { createRequestLogger } = require('../../lib/request-logger');

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    await initializeDatabase();

    const userResult = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;

    if (userResult.length > 0) {
      const userId = userResult[0].id;
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Invalidate any existing unused tokens for this user
      await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId} AND used_at IS NULL`;

      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
      `;

      await sendPasswordResetEmail(email.toLowerCase(), token).catch((err) => {
        log.error(err, 'Failed to send password reset email');
      });
    }

    // Always 200 to prevent user enumeration
    res.status(200).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Forgot password error');
    res.status(500).json({ error: 'Failed to process request' });
    logResponse(res);
  }
};
