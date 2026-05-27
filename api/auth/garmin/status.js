'use strict';

const { sql, initializeDatabase } = require('../../../lib/db');
const { getUserFromSession } = require('../../../lib/session');
const { createRequestLogger } = require('../../../lib/request-logger');

/**
 * GET /api/auth/garmin/status
 *
 * Returns Garmin link status for the authenticated user.
 */
module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end();
    return;
  }

  const userId = getUserFromSession(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await initializeDatabase();

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
    logResponse(res);
  } catch (err) {
    log.error(err, 'Garmin status error');
    res.status(500).json({ error: 'Failed to get Garmin status' });
    logResponse(res);
  }
};
