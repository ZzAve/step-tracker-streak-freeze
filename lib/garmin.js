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

const MAX_CHUNK_DAYS = 28;

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Fetch daily step counts for a date range.
 * Calls the Garmin range endpoint directly (up to 28 days per request),
 * automatically chunking longer ranges into multiple requests.
 *
 * @param {object} tokens - IGarminTokens object
 * @param {string} startDate - YYYY-MM-DD inclusive start
 * @param {string} endDate - YYYY-MM-DD inclusive end
 * @returns {Promise<Array<{date: string, steps: number}>>}
 */
async function fetchDailySteps(tokens, startDate, endDate) {
  const client = createClient(tokens);
  const baseUrl = client.url.DAILY_STEPS;

  const results = [];
  const chunkStart = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (chunkStart <= end) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + MAX_CHUNK_DAYS - 1);
    if (chunkEnd > end) {
      chunkEnd.setTime(end.getTime());
    }

    const fromStr = toDateStr(chunkStart);
    const toStr = toDateStr(chunkEnd);

    try {
      console.log(`Fetching steps ${fromStr} to ${toStr}`);
      const days = await client.client.get(`${baseUrl}${fromStr}/${toStr}`);

      if (Array.isArray(days)) {
        for (const day of days) {
          results.push({
            date: day.calendarDate,
            steps: typeof day.totalSteps === 'number' ? day.totalSteps : 0,
          });
        }
      }
    } catch (err) {
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        throw err;
      }
      console.error(`Failed to fetch steps for ${fromStr} to ${toStr}:`, err.message);
    }

    chunkStart.setUTCDate(chunkEnd.getUTCDate() + 1);
  }

  return results;
}

module.exports = { fetchDailySteps };
