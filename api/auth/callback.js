/**
 * GET /api/auth/callback
 *
 * Handles the OAuth 1.0a callback from Garmin:
 * 1. Reads oauth_token + oauth_verifier from query params.
 * 2. Retrieves the stored request token from the signed cookie.
 * 3. Exchanges for an access token.
 * 4. Upserts the user in the DB and initialises their streaks row.
 * 5. Sets a session cookie and redirects to /.
 */

const { sql, initializeDatabase } = require('../../lib/db');
const { createSessionCookie, unsign } = require('../../lib/session');
const { getOAuthClient } = require('../../lib/oauth');

const ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
const COOKIE_NAME = 'oauth_request_token';

/**
 * Parse a cookie header string into a plain object.
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

/**
 * Clear the temporary request token cookie.
 */
function clearRequestTokenCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Max-Age=0; HttpOnly${secure}; SameSite=Lax; Path=/`;
}

module.exports = async (req, res) => {
  // Set Content-Type for all HTML error responses in this handler
  res.setHeader('Content-Type', 'text/html');

  // Always clear the temporary cookie regardless of outcome
  const clearCookie = clearRequestTokenCookie();

  try {
    const { oauth_token: callbackToken, oauth_verifier: oauthVerifier } = req.query || {};

    if (!callbackToken || !oauthVerifier) {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(400).send('Missing oauth_token or oauth_verifier. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    // Retrieve and verify the stored request token cookie
    const cookies = parseCookies(req.headers.cookie);
    const signedCookie = cookies[COOKIE_NAME];
    if (!signedCookie) {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(400).send('OAuth session expired or missing. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      res.status(500).send('Server configuration error');
      return;
    }

    const rawPayload = unsign(signedCookie, secret);
    if (!rawPayload) {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(400).send('Invalid OAuth session cookie. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    let requestToken, requestTokenSecret;
    try {
      const parsed = JSON.parse(Buffer.from(rawPayload, 'base64').toString('utf8'));
      requestToken = parsed.token;
      requestTokenSecret = parsed.secret;
    } catch {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(400).send('Corrupt OAuth session. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    // Sanity check: the token in the cookie should match the callback token
    if (requestToken !== callbackToken) {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(400).send('OAuth token mismatch. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    // Exchange request token + verifier for access token
    const oauth = getOAuthClient();
    const requestData = { url: ACCESS_TOKEN_URL, method: 'POST' };
    const tokenData = { key: requestToken, secret: requestTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, tokenData));

    const accessResponse = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `oauth_verifier=${encodeURIComponent(oauthVerifier)}`,
    });

    if (!accessResponse.ok) {
      const body = await accessResponse.text();
      console.error('Garmin access token error:', accessResponse.status, body);
      res.setHeader('Set-Cookie', clearCookie);
      res.status(502).send('Failed to obtain access token from Garmin. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    const accessBody = await accessResponse.text();
    const accessParams = new URLSearchParams(accessBody);
    const accessToken = accessParams.get('oauth_token');
    const accessTokenSecret = accessParams.get('oauth_token_secret');

    if (!accessToken || !accessTokenSecret) {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(502).send('Invalid access token response from Garmin. <a href="/api/auth/garmin">Try again</a>');
      return;
    }

    // Garmin returns a userId in the access token response; fall back to accessToken if absent
    const garminUserId = accessParams.get('userId') || accessToken;

    // Ensure DB is initialised (idempotent)
    await initializeDatabase();

    // Upsert user — store access token and secret server-side only
    const result = await sql`
      INSERT INTO users (garmin_user_id, oauth_token, oauth_token_secret)
      VALUES (${garminUserId}, ${accessToken}, ${accessTokenSecret})
      ON CONFLICT (garmin_user_id)
      DO UPDATE SET
        oauth_token        = EXCLUDED.oauth_token,
        oauth_token_secret = EXCLUDED.oauth_token_secret
      RETURNING id
    `;

    const userId = result[0].id;

    // Initialise streak row for new users (no-op for existing)
    await sql`
      INSERT INTO streaks (user_id)
      VALUES (${userId})
      ON CONFLICT DO NOTHING
    `;

    // Set session cookie and clear the temporary request token cookie
    const sessionCookie = createSessionCookie(userId);
    res.setHeader('Set-Cookie', [sessionCookie, clearCookie]);

    res.redirect(302, '/');
  } catch (err) {
    console.error('Error in /api/auth/callback:', err);
    res.setHeader('Set-Cookie', clearCookie);
    res.status(500).send('Internal server error. <a href="/api/auth/garmin">Try again</a>');
  }
};
