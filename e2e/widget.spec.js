const { test, expect } = require('@playwright/test');
const { uniqueEmail, uniqueApiKey, createUser } = require('./helpers');
const {
  seedApiKey,
  seedDailySteps,
  consecutiveGoalMetEndingYesterday,
  dateStrDaysAgo,
} = require('./seed');

// GET the widget endpoint with a raw key in the query string.
function getWidget(request, key) {
  return request.get(`/api/widget?key=${encodeURIComponent(key)}`);
}

// Arrange a fresh user with a seeded key + seeded steps, then fetch the widget.
// Uses a seeded key (not the real mint endpoint) for speed/determinism — the
// real minting path is proven once, separately, below.
async function seededWidget(request, rows, keyOpts) {
  const email = uniqueEmail();
  await createUser(request, email);
  const key = uniqueApiKey();
  await seedApiKey(email, key, keyOpts);
  if (rows) await seedDailySteps(email, rows);
  const res = await getWidget(request, key);
  return { email, key, res };
}

test.describe('widget API contract', () => {
  test('a key minted via the real endpoint authenticates the widget', async ({ request }) => {
    // register() sets the session cookie on this request context; the mint
    // request reuses it. This is the only test that exercises POST /api/apikey.
    const email = uniqueEmail();
    await createUser(request, email);

    const mintRes = await request.post('/api/apikey', { data: { name: 'e2e' } });
    expect(mintRes.status(), 'mint key').toBe(201);
    const { key } = await mintRes.json();
    expect(key, 'minted plaintext key returned once').toBeTruthy();

    const res = await getWidget(request, key);
    expect(res.status(), 'minted key authenticates widget').toBe(200);
    const data = await res.json();
    expect(data.step_goal).toBe(10000);
    expect(typeof data.streak).toBe('number');
  });

  test('response matches the published widget contract', async ({ request }) => {
    const { res } = await seededWidget(request, consecutiveGoalMetEndingYesterday(3));
    expect(res.status()).toBe(200);
    const d = await res.json();

    expect(typeof d.streak).toBe('number');
    expect(typeof d.longest).toBe('number');
    expect(typeof d.freezes).toBe('number');
    // next_milestone / days_to_milestone are number-or-null; today_steps too.
    expect(d).toHaveProperty('next_milestone');
    expect(d).toHaveProperty('days_to_milestone');
    expect(d).toHaveProperty('today_steps');
    expect(d.step_goal).toBe(10000);

    expect(Array.isArray(d.week)).toBe(true);
    expect(d.week).toHaveLength(7);
    for (const entry of d.week) {
      expect(typeof entry.day).toBe('string');
      expect(typeof entry.status).toBe('string');
    }

    // refreshAfter is always a round-trippable ISO string; a never-synced user
    // (no Garmin tokens) has a null lastUpdatedAt.
    expect(new Date(d.refreshAfter).toISOString()).toBe(d.refreshAfter);
    expect(d.lastUpdatedAt).toBeNull();
  });

  test('streak and milestone countdown match the seeded run', async ({ request }) => {
    // 3 goal-met days ending yesterday; the streak engine excludes today.
    const { res } = await seededWidget(request, consecutiveGoalMetEndingYesterday(3));
    const d = await res.json();
    expect(d.streak).toBe(3);
    expect(d.freezes).toBe(0); // 3 < 5 goal-days
    expect(d.next_milestone).toBe(5);
    expect(d.days_to_milestone).toBe(2);
  });

  test('a 5-day run earns one freeze and advances the milestone', async ({ request }) => {
    const { res } = await seededWidget(request, consecutiveGoalMetEndingYesterday(5));
    const d = await res.json();
    expect(d.streak).toBe(5);
    expect(d.freezes).toBe(1); // 1 freeze per 5 goal-days (parity with steps.spec)
    expect(d.next_milestone).toBe(10);
    expect(d.days_to_milestone).toBe(5);
  });

  test("today's steps and week tail reflect a goal-met today", async ({ request }) => {
    const { res } = await seededWidget(request, [{ date: dateStrDaysAgo(0), steps: 12345 }]);
    const d = await res.json();
    expect(d.today_steps).toBe(12345);
    expect(d.week[6].status).toBe('goal_met'); // index 6 is today
  });

  test("today's steps and week tail reflect a below-goal today", async ({ request }) => {
    const { res } = await seededWidget(request, [
      { date: dateStrDaysAgo(0), steps: 4000, goalMet: false },
    ]);
    const d = await res.json();
    expect(d.today_steps).toBe(4000);
    expect(d.week[6].status).toBe('pending'); // today below goal stays pending
  });

  test('a missing key is rejected as missing', async ({ request }) => {
    const res = await request.get('/api/widget');
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('Missing API key');
  });

  test('an unknown key is rejected as invalid', async ({ request }) => {
    const res = await getWidget(request, uniqueApiKey());
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('Invalid API key');
  });

  test('an expired key is rejected as expired', async ({ request }) => {
    const email = uniqueEmail();
    await createUser(request, email);
    const key = uniqueApiKey();
    await seedApiKey(email, key, { daysToExpiry: -1 });

    const res = await getWidget(request, key);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('API key expired');
  });
});
