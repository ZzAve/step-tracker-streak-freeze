'use strict';

const { sql, initializeDatabase } = require('../lib/db');
const { getUserFromSession, generateApiKey } = require('../lib/session');

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET, POST').end();
    return;
  }

  try {
    await initializeDatabase();

    const userId = getUserFromSession(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      const result = await sql`SELECT api_key FROM users WHERE id = ${userId}`;
      const key = result[0]?.api_key || null;
      res.status(200).json({ api_key: key });
      return;
    }

    // POST — generate new key
    const newKey = generateApiKey();
    await sql`UPDATE users SET api_key = ${newKey} WHERE id = ${userId}`;
    res.status(200).json({ api_key: newKey });
  } catch (err) {
    console.error('Error in /api/apikey:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
