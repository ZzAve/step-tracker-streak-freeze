'use strict';

const { sql, initializeDatabase } = require('../../../lib/db');
const { getUserFromSession } = require('../../../lib/session');
const { createRequestLogger } = require('../../../lib/request-logger');

/**
 * POST /api/auth/garmin/unlink
 *
 * Unlinks the Garmin account from the authenticated app account.
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
    await initializeDatabase();
    await sql`
      UPDATE users SET garmin_user_id = NULL, garmin_tokens = NULL, last_synced_at = NULL
      WHERE id = ${userId}
    `;
    res.status(200).json({ ok: true });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Garmin unlink error');
    res.status(500).json({ error: 'Failed to unlink Garmin account' });
    logResponse(res);
  }
};
