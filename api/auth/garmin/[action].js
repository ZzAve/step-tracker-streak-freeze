'use strict';

const GarminConnect = require('garmin-connect').GarminConnect;
const { sql, initializeDatabase } = require('../../../lib/db');
const { getUserFromSession } = require('../../../lib/session');
const { createRequestLogger } = require('../../../lib/request-logger');

/**
 * GET /api/auth/garmin/status — Garmin link status
 */
async function handleStatus(req, res, userId) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end();
    return;
  }

  const result = await sql`
    SELECT garmin_user_id, last_synced_at FROM users WHERE id = ${userId}
  `;
  if (result.length === 0) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const user = result[0];
  res.status(200).json({
    linked: !!user.garmin_user_id,
    garminUserId: user.garmin_user_id || null,
    lastSyncedAt: user.last_synced_at || null,
  });
}

/**
 * POST /api/auth/garmin/link — Link a Garmin account
 */
async function handleLink(req, res, userId) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  const { garminEmail, garminPassword } = req.body || {};
  if (!garminEmail || !garminPassword) {
    res.status(400).json({ error: 'garminEmail and garminPassword are required' });
    return;
  }

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
}

/**
 * POST /api/auth/garmin/unlink — Unlink the Garmin account
 */
async function handleUnlink(req, res, userId) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  await sql`
    UPDATE users SET garmin_user_id = NULL, garmin_tokens = NULL, last_synced_at = NULL
    WHERE id = ${userId}
  `;
  res.status(200).json({ ok: true });
}

const handlers = { status: handleStatus, link: handleLink, unlink: handleUnlink };

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);
  const { action } = req.query;

  const userId = getUserFromSession(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const handler = handlers[action];
  if (!handler) {
    res.status(404).json({ error: 'Unknown action' });
    return;
  }

  try {
    await initializeDatabase();
    await handler(req, res, userId);
    logResponse(res);
  } catch (err) {
    log.error(err, `Garmin ${action} error`);
    if (action === 'link' && err.message && (err.message.includes('401') || err.message.includes('credentials'))) {
      res.status(401).json({ error: 'Invalid Garmin credentials' });
    } else {
      res.status(500).json({ error: `Failed to ${action} Garmin account` });
    }
    logResponse(res);
  }
};
