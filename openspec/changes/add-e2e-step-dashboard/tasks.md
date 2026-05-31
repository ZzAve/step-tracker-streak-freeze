## 1. Step seeding helper

- [ ] 1.1 Add a test-only seed helper in `e2e/` that connects to the local Postgres using the same DB wiring the harness already uses (env-driven, no new config)
- [ ] 1.2 Resolve a registered test user's id by email within the helper
- [ ] 1.3 Implement seeding of `daily_steps` rows for a user: `(user_id, date, steps, goal_met)`, idempotent per `(user_id, date)`
- [ ] 1.4 Provide a way to build a run of consecutive day fixtures relative to the server's current date (avoid midnight off-by-one)

## 2. Step dashboard coverage

- [ ] 2.1 Add a test: register a fresh user, seed today's steps, load the dashboard, assert `.day-cell.today .day-steps` shows the seeded value (accounting for number formatting)
- [ ] 2.2 Add a test: seed a run of consecutive goal-met days, assert `#streak-current` shows a streak consistent with that run
- [ ] 2.3 Add a test: seed the past several days, assert the `#days-grid` `.day-cell` row reflects each day's goal-met state (`.goal-met` / `.goal-missed` / indicator)
- [ ] 2.4 Add a test: assert `#freeze-count-text` shows the available freezes (`streak.freeze_count`) derived from the seeded data
- [ ] 2.5 Confirm no Garmin network call occurs (rely on the `!user.garmin_tokens` short-circuit; assert the served `GET /api/steps` data equals the seeded data)

## 3. Verification

- [ ] 3.1 Run the e2e suite in parallel and confirm the new step-dashboard tests are green and deterministic across repeated runs
- [ ] 3.2 Confirm `npm test` (unit suite) still runs independently without the database or browser binaries
- [ ] 3.3 Run `./node_modules/.bin/openspec validate add-e2e-step-dashboard --strict` and fix any issues
