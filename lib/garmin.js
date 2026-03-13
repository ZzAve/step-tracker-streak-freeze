'use strict';

const { getOAuthClient } = require('./oauth');

const DAILIES_URL = 'https://apis.garmin.com/wellness-api/rest/dailies';

/**
 * Convert a YYYY-MM-DD date string to a Unix timestamp (seconds) at midnight UTC.
 * @param {string} dateStr
 * @returns {number}
 */
function dateToUnixSeconds(dateStr) {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
}

/**
 * Fetch daily step summaries from the Garmin Wellness API.
 *
 * @param {string} oauthToken  User's access token
 * @param {string} oauthTokenSecret  User's access token secret
 * @param {string} startDate  YYYY-MM-DD inclusive start
 * @param {string} endDate    YYYY-MM-DD inclusive end
 * @returns {Promise<Array<{date: string, steps: number}>>}
 */
async function fetchDailySteps(oauthToken, oauthTokenSecret, startDate, endDate) {
  const uploadStartTimeInSeconds = dateToUnixSeconds(startDate);
  // End at the end of the end-date day (start of next day)
  const uploadEndTimeInSeconds = dateToUnixSeconds(endDate) + 86400;

  const url = new URL(DAILIES_URL);
  url.searchParams.set('uploadStartTimeInSeconds', String(uploadStartTimeInSeconds));
  url.searchParams.set('uploadEndTimeInSeconds', String(uploadEndTimeInSeconds));

  const oauth = getOAuthClient();
  const token = { key: oauthToken, secret: oauthTokenSecret };
  const requestData = { url: url.toString(), method: 'GET' };
  const headers = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { ...headers, Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Garmin API error ${response.status}: ${body}`);
  }

  const data = await response.json();

  // The Garmin dailies endpoint returns an array of summary objects.
  // Each object has a `calendarDate` (YYYY-MM-DD) and `totalSteps`.
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((entry) => entry.calendarDate && typeof entry.totalSteps === 'number')
    .map((entry) => ({
      date: entry.calendarDate,
      steps: entry.totalSteps,
    }));
}

module.exports = { fetchDailySteps };
