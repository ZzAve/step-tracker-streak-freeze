/**
 * GET /api/auth/logout
 *
 * Clears the session cookie and redirects to /.
 */

const { clearSessionCookie } = require('../../lib/session');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.writeHead(302, { Location: '/' });
  res.end();
};
