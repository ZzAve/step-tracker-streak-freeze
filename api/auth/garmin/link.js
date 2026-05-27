'use strict';

const GarminConnect = require('garmin-connect').GarminConnect;
const { sql, initializeDatabase } = require('../../../lib/db');
const { getUserFromSession } = require('../../../lib/session');
const { createRequestLogger } = require('../../../lib/request-logger');

/**
 * POST /api/auth/garmin/link
 *
 * Links a Garmin account to the authenticated app account.
 */
module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  const userId = getUserFromSession(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { garminEmail, garminPassword } = req.body || {};
    if (!garminEmail || !garminPassword) {
      res.status(400).json({ error: 'garminEmail and garminPassword are required' });
      return;
    }

    await initializeDatabase();

    // Check if this Garmin account is already linked to another user
    const existing = await sql`
      SELECT id FROM users WHERE garmin_user_id = ${garminEmail.toLowerCase()} AND id != ${userId}
    `;
    if (existing.length > 0) {
      res.status(409).json({ error: 'This Garmin account is already linked to another user' });
      return;
    }

    const client = new GarminConnect({ username: garminEmail, password: garminPassword });
    await client.login(garminEmail, garminPassword);
    const tokens = client.exportToken();

    await sql`
      UPDATE users
      SET garmin_user_id = ${garminEmail.toLowerCase()}, garmin_tokens = ${JSON.stringify(tokens)}
      WHERE id = ${userId}
    `;

    res.status(200).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Garmin link error');
    if (err.message && (err.message.includes('401') || err.message.includes('credentials'))) {
      res.status(401).json({ error: 'Invalid Garmin credentials' });
    } else {
      res.status(500).json({ error: 'Failed to link Garmin account' });
    }
    logResponse(res);
  }
};
