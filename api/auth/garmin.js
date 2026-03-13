/**
 * GET /api/auth/garmin
 *
 * Initiates the Garmin OAuth 1.0a flow:
 * 1. Obtains a request token from Garmin Connect.
 * 2. Stores it in a signed, httpOnly cookie so the callback can retrieve it.
 * 3. Redirects the user to Garmin's authorization page.
 */

const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const { sign } = require('../../lib/session');

const REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
const AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm';
const COOKIE_NAME = 'oauth_request_token';

function getOAuthClient() {
  return new OAuth({
    consumer: {
      key: process.env.GARMIN_CONSUMER_KEY,
      secret: process.env.GARMIN_CONSUMER_SECRET,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
}

function requestTokenCookieFlags() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // Short-lived: 10 minutes is more than enough to complete the OAuth dance
  return `HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=600`;
}

module.exports = async (req, res) => {
  try {
    const consumerKey = process.env.GARMIN_CONSUMER_KEY;
    const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      console.error('Missing GARMIN_CONSUMER_KEY or GARMIN_CONSUMER_SECRET');
      res.status(500).send('Server configuration error');
      return;
    }

    const oauth = getOAuthClient();
    const requestData = { url: REQUEST_TOKEN_URL, method: 'POST' };
    const headers = oauth.toHeader(oauth.authorize(requestData));

    // Fetch request token from Garmin
    const response = await fetch(REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Garmin request token error:', response.status, body);
      res.status(502).send('Failed to obtain request token from Garmin. Please try again.');
      return;
    }

    const body = await response.text();
    const params = new URLSearchParams(body);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      console.error('Garmin response missing token fields:', body);
      res.status(502).send('Invalid response from Garmin. Please try again.');
      return;
    }

    // Store the request token secret in a signed cookie so the callback can use it
    const cookiePayload = JSON.stringify({ token: oauthToken, secret: oauthTokenSecret });
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      res.status(500).send('Server configuration error');
      return;
    }
    const signedValue = sign(Buffer.from(cookiePayload).toString('base64'), secret);
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(signedValue)}; ${requestTokenCookieFlags()}`
    );

    // Redirect user to Garmin's authorization page
    res.writeHead(302, { Location: `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(oauthToken)}` });
    res.end();
  } catch (err) {
    console.error('Error in /api/auth/garmin:', err);
    res.status(500).send('Internal server error');
  }
};
