'use strict';

const crypto = require('crypto');
const { sql, initializeDatabase } = require('../lib/db');
const { getUserFromSession, generateApiKey } = require('../lib/session');
const { createRequestLogger } = require('../lib/request-logger');

const MAX_KEYS = 3;
const KEY_LIFETIME_DAYS = 365;

function hashKey(plaintext) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

async function handleGet(userId, res) {
  const keys = await sql`
    SELECT id, name, prefix, created_at, expires_at, last_used_at
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  res.status(200).json({ keys });
}

async function handlePost(userId, req, res) {
  const countResult = await sql`
    SELECT COUNT(*)::int AS count FROM api_keys WHERE user_id = ${userId}
  `;
  if (countResult[0].count >= MAX_KEYS) {
    res.status(400).json({ error: `Maximum van ${MAX_KEYS} API keys bereikt` });
    return;
  }

  const name = req.body?.name || null;
  const plaintext = generateApiKey();
  const keyHash = hashKey(plaintext);
  const prefix = plaintext.slice(0, 8);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + KEY_LIFETIME_DAYS);

  const result = await sql`
    INSERT INTO api_keys (user_id, name, key_hash, prefix, created_at, expires_at)
    VALUES (${userId}, ${name}, ${keyHash}, ${prefix}, ${now.toISOString()}, ${expiresAt.toISOString()})
    RETURNING id, name, prefix, created_at, expires_at
  `;

  res.status(201).json({
    key: plaintext,
    ...result[0],
  });
}

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  try {
    await initializeDatabase();

    const userId = getUserFromSession(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    switch (req.method) {
      case 'GET':
        await handleGet(userId, res);
        break;
      case 'POST':
        await handlePost(userId, req, res);
        break;
      default:
        res.status(405).setHeader('Allow', 'GET, POST').end();
    }
    logResponse(res);
  } catch (err) {
    log.error(err, 'Error in /api/apikey');
    res.status(500).json({ error: 'Internal server error' });
    logResponse(res);
  }
};
