/**
 * GET /api/auth/logout
 *
 * Clears the session cookie and redirects to /.
 */

const { clearSessionCookie } = require('../../lib/session');
const { createRequestLogger } = require('../../lib/request-logger');

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.writeHead(302, { Location: '/' });
  res.end();
  logResponse(res);
};
