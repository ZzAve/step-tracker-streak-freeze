'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sql, initializeDatabase } = require('../../lib/db');
const { createRequestLogger } = require('../../lib/request-logger');

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    await initializeDatabase();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenResult = await sql`
      SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
    `;

    if (tokenResult.length === 0) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const { id: tokenId, user_id: userId } = tokenResult[0];
    const passwordHash = await bcrypt.hash(password, 12);

    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
    await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${tokenId}`;

    res.status(200).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Reset password error');
    res.status(500).json({ error: 'Failed to reset password' });
    logResponse(res);
  }
};
