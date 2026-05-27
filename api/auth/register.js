'use strict';

const bcrypt = require('bcryptjs');
const { sql, initializeDatabase } = require('../../lib/db');
const { createSessionCookie } = require('../../lib/session');
const { createRequestLogger } = require('../../lib/request-logger');

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
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    await initializeDatabase();

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email.toLowerCase()}, ${passwordHash})
      RETURNING id
    `;

    res.setHeader('Set-Cookie', createSessionCookie(result[0].id));
    res.status(201).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Register error');
    res.status(500).json({ error: 'Registration failed' });
    logResponse(res);
  }
};
