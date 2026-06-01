const { test, expect } = require('@playwright/test');
const { uniqueEmail, createUser, loginViaUI } = require('./helpers');
const {
  seedDailySteps,
  consecutiveGoalMetEndingYesterday,
  dateStrDaysAgo,
} = require('./seed');

// Strip locale formatting (e.g. nl-NL "12.345") down to the raw digits so DOM
// assertions don't depend on the browser's number formatting.
function digitsOf(text) {
  return (text || '').replace(/\D/g, '');
}

// Local "today" cell index in the Monday-first weekly grid (Mon=0 .. Sun=6),
// mirroring the frontend's getMondayOfWeek / day ordering.
function todayCellIndex() {
  return (new Date().getDay() + 6) % 7;
}

// Arrange a fresh, signed-in user with seeded steps, ready at the dashboard.
async function signedInWithSteps(page, request, rows) {
  const email = uniqueEmail();
  await createUser(request, email);
  await seedDailySteps(email, rows);
  await loginViaUI(page, email);
  await expect(page.locator('#dashboard')).toBeVisible();
  return email;
}

test.describe('step dashboard', () => {
  test("today's steps render in the today cell", async ({ page, request }) => {
    await signedInWithSteps(page, request, [
      { date: dateStrDaysAgo(0), steps: 12345 }, // >= goal -> goal-met
    ]);

    const todaySteps = page.locator('.day-cell.today .day-steps');
    await expect(todaySteps).toBeVisible();
    await expect.poll(async () => digitsOf(await todaySteps.textContent())).toBe('12345');
  });

  test('a run of consecutive goal-met days drives the current streak', async ({ page, request }) => {
    // 3 goal-met days ending yesterday; today is excluded by the streak engine.
    await signedInWithSteps(page, request, consecutiveGoalMetEndingYesterday(3));

    await expect(page.locator('#streak-current')).toHaveText('3');
    // 3 < 5 goal-days, so no freeze earned yet.
    await expect(page.locator('#freeze-count-text')).toHaveText('0 / 2');
  });

  test('the weekly grid reflects each past day\'s goal-met state', async ({ page, request }) => {
    // Seed Monday..today of the current week with an alternating pattern so the
    // grid shows both goal-met and goal-missed cells (when today isn't Monday).
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // today's index, Mon=0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);
    monday.setHours(0, 0, 0, 0);

    const rows = [];
    for (let i = 0; i <= dow; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const goalMet = i % 2 === 0; // even index hits the goal, odd misses it
      rows.push({ date, steps: goalMet ? 12000 : 5000, goalMet });
    }

    await signedInWithSteps(page, request, rows);

    const cells = page.locator('#days-grid .day-cell');
    await expect(cells).toHaveCount(7);

    const todayIdx = todayCellIndex();
    for (let i = 0; i < 7; i++) {
      const cell = cells.nth(i);
      if (i > todayIdx) {
        await expect(cell).toHaveClass(/future/);
      } else {
        await expect(cell).toHaveClass(i % 2 === 0 ? /goal-met/ : /goal-missed/);
      }
    }
    await expect(cells.nth(todayIdx)).toHaveClass(/today/);
  });

  test('available freezes reflect the seeded streak', async ({ page, request }) => {
    // 5 consecutive goal-met days earns exactly one freeze (1 per 5 goal-days).
    await signedInWithSteps(page, request, consecutiveGoalMetEndingYesterday(5));

    await expect(page.locator('#streak-current')).toHaveText('5');
    await expect(page.locator('#freeze-count-text')).toHaveText('1 / 2');
  });

  test('GET /api/steps serves exactly the seeded data, with no Garmin sync', async ({ page, request }) => {
    // Fixed past-day fixture; api/steps returns rows ORDER BY date ASC.
    const rows = [
      { date: dateStrDaysAgo(3), steps: 15000, goalMet: true },
      { date: dateStrDaysAgo(2), steps: 5000, goalMet: false },
      { date: dateStrDaysAgo(1), steps: 12000, goalMet: true },
    ];
    await signedInWithSteps(page, request, rows);

    const res = await page.request.get('/api/steps');
    expect(res.status()).toBe(200);
    const data = await res.json();

    // A fresh user has no Garmin tokens: sync short-circuits, nothing is mutated.
    expect(data.garmin_linked).toBe(false);
    expect(data.last_synced_at).toBeNull();
    expect(data.steps).toEqual(
      rows.map((r) => ({ date: r.date, steps: r.steps, goal_met: r.goalMet }))
    );
  });
});
