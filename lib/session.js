const crypto = require('crypto');

const COOKIE_NAME = 'session';
const SESSION_SECRET = () => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET environment variable is not set');
  return s;
};

/**
 * Sign arbitrary data with HMAC-SHA256.
 * Returns "<data>.<hex-signature>".
 */
function sign(data, secret) {
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${sig}`;
}

/**
 * Verify and unsign a value previously produced by sign().
 * Returns the original data string, or null if invalid.
 */
function unsign(signed, secret) {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const data = signed.slice(0, lastDot);
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  const actual = signed.slice(lastDot + 1);
  // Constant-time comparison to prevent timing attacks
  if (actual.length !== expected.length) return null;
  const match = crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  return match ? data : null;
}

/**
 * Build common cookie flags.
 */
function cookieFlags() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `HttpOnly${secure}; SameSite=Lax; Path=/`;
}

/**
 * Create a signed session cookie string for the given userId.
 * @param {string|number} userId
 * @returns {string} Full Set-Cookie header value
 */
function createSessionCookie(userId) {
  const value = sign(String(userId), SESSION_SECRET());
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; ${cookieFlags()}`;
}

/**
 * Parse the session cookie from the request, verify its signature, and return
 * the userId, or null if missing / invalid.
 * @param {import('http').IncomingMessage} req
 * @returns {string|null} userId or null
 */
function getUserFromSession(req) {
  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    const signed = cookies[COOKIE_NAME];
    if (!signed) return null;
    return unsign(signed, SESSION_SECRET());
  } catch {
    return null;
  }
}

/**
 * Return a cookie string that clears the session cookie.
 * @returns {string} Full Set-Cookie header value
 */
function clearSessionCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; ${cookieFlags()}`;
}

module.exports = { createSessionCookie, getUserFromSession, clearSessionCookie, sign, unsign };
