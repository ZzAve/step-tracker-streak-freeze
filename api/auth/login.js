'use strict';

const GarminConnect = require('garmin-connect').GarminConnect;
const { sql, initializeDatabase } = require('../../lib/db');
const { createSessionCookie } = require('../../lib/session');

module.exports = async (req, res) => {
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

    const client = new GarminConnect({ username: email, password });
    await client.login(email, password);

    const tokens = client.exportToken();
    const garminUserId = email;

    const userResult = await sql`
      INSERT INTO users (garmin_user_id, garmin_tokens)
      VALUES (${garminUserId}, ${JSON.stringify(tokens)})
      ON CONFLICT (garmin_user_id)
      DO UPDATE SET garmin_tokens = ${JSON.stringify(tokens)}
      RETURNING id
    `;
    const userId = userResult[0].id;

    res.setHeader('Set-Cookie', createSessionCookie(userId));
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Login error:', err);
    if (err.message && (err.message.includes('401') || err.message.includes('credentials'))) {
      res.status(401).json({ error: 'Invalid Garmin credentials' });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  }
};
