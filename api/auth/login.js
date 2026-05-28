'use strict';

const bcrypt = require('bcryptjs');
const { sql, initializeDatabase } = require('../../lib/db');
const { createSessionCookie } = require('../../lib/session');
const { createRequestLogger } = require('../../lib/request-logger');

// Dummy hash used to maintain constant-time behavior when user doesn't exist
const DUMMY_HASH = '$2a$12$iHqMdPAE.xdwDMlQe5NCMO7vjh6RFrFSEm2/S08M7iMb5oMBsUdei';

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    await initializeDatabase();

    const userResult = await sql`
      SELECT id, password_hash FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (userResult.length === 0) {
      // Constant-time dummy compare to prevent user enumeration via timing
      await bcrypt.compare(password, DUMMY_HASH);
      res.status(401).json({ error: 'Invalid credentials' });
      logResponse(res);
      return;
    }

    const user = userResult[0];

    if (!user.password_hash) {
      // Existing Garmin-only account: guide user through migration
      res.status(401).json({ error: 'no_password' });
      logResponse(res);
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      logResponse(res);
      return;
    }

    res.setHeader('Set-Cookie', createSessionCookie(user.id));
    res.status(200).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Login error');
    res.status(500).json({ error: 'Login failed' });
    logResponse(res);
  }
};
