'use strict';

const GarminConnect = require('garmin-connect').GarminConnect;

/**
 * Create a garmin-connect client and restore session from stored tokens.
 * @param {object} tokens - IGarminTokens object ({ oauth1, oauth2 })
 * @returns {GarminConnect}
 */
function createClient(tokens) {
  const client = new GarminConnect({ username: 'token-restore', password: 'token-restore' });
  // console.log("Before load token", client)
  client.loadToken(tokens.oauth1, tokens.oauth2);
  // console.log("After load token", client)
  return client;
}

/**
 * Fetch daily step counts for a date range using garmin-connect.
 * Iterates per day since getSteps() returns a single day's total.
 *
 * @param {object} tokens - IGarminTokens object
 * @param {string} startDate - YYYY-MM-DD inclusive start
 * @param {string} endDate - YYYY-MM-DD inclusive end
 * @returns {Promise<Array<{date: string, steps: number}>>}
 */
async function fetchDailySteps(tokens, startDate, endDate) {
  const client = createClient(tokens);

  const results = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    try {
      const steps = await client.getSteps(new Date(current));
      console.log(`Data ${dateStr}: ${steps}`)
      if (typeof steps === 'number') {
        results.push({ date: dateStr, steps });
      } else {
        results.push({ date: dateStr, steps: 0 });
      }
    } catch (err) {
      // If token failure, rethrow so caller can handle as 401
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        throw err;
      }
      // Skip individual day failures (e.g. no data)
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
}

module.exports = { fetchDailySteps };
