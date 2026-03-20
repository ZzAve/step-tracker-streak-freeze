'use strict';

const { sql, initializeDatabase } = require('../../lib/db');
const { getUserFromSession } = require('../../lib/session');
const logger = require('../../lib/logger');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    res.status(405).setHeader('Allow', 'DELETE').end();
    return;
  }

  try {
    await initializeDatabase();

    const userId = getUserFromSession(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const keyId = parseInt(req.query.id, 10);
    if (!keyId || isNaN(keyId)) {
      res.status(400).json({ error: 'Missing key id' });
      return;
    }

    const result = await sql`
      DELETE FROM api_keys
      WHERE id = ${keyId} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Key niet gevonden' });
      return;
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    logger.error(err, 'Error in DELETE /api/apikey/[id]');
    res.status(500).json({ error: 'Internal server error' });
  }
};