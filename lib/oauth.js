'use strict';

const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

/**
 * Create and return a configured OAuth 1.0a client using the Garmin consumer
 * key/secret from environment variables.
 * @returns {OAuth}
 */
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

module.exports = { getOAuthClient };
