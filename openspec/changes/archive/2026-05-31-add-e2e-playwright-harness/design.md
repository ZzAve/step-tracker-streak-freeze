## Context

Current automated testing is unit-only (Node's built-in runner, ~100 tests) with all I/O mocked: `lib/db.js`'s `sql()` is stubbed, `lib/garmin.js` and `lib/email.js` are stubbed, and handlers run against fabricated `req`/`res` objects. This proves each unit in isolation but never proves the wired-together system: a real HTTP request flowing through a real handler, through real streak/sync logic, into a real Postgres row, and back out as JSON the frontend renders. That integration gap is where production bugs hide.

A local Postgres already exists for development via `docker-compose` (Postgres + Neon local proxy on port 4444), pointed at by a DB-URL env var, with migrations in `migrations/`. There is no e2e or browser-test harness of any kind today.

This design covers **Phase 1** of a phased rollout agreed during brainstorming. Phase 1 is the *walking skeleton*: it stands up the entire harness using the one flow (authentication) that needs no external fakes. Later phases build on this skeleton and are summarized in the Roadmap below but are out of scope here.

## Goals / Non-Goals

**Goals:**
- Stand up a Playwright Test harness that boots the real app and drives the real frontend in a headless browser.
- Run against a real local Postgres with production migrations applied.
- Make tests deterministic and parallel-safe without global DB teardown.
- Cover register → login → logout end-to-end as the first real flow.
- Keep all "test mode" behaviour at the app's external edges (env-configured), with zero changes to production code paths in this phase.

**Non-Goals:**
- No Garmin or Resend fakes, no fake backend, no control endpoint (introduced in later phases).
- No visual-regression / screenshot snapshots — assertions are functional (DOM content / state) only.
- No testing of the MonkeyC watch app.
- No CI pipeline wiring required to land this phase (noted in Roadmap, deferred).
- No refactor of how the app composes its dependencies.

## Decisions

**1. Browser-driven (Playwright Test) over HTTP-level testing.**
We drive the actual `public/` pages in a headless browser rather than calling API endpoints directly. Rationale: the ~1800 lines of embedded frontend JS are entirely untested, and the user explicitly wants to watch the frontend evolve and confirm flows still work through the real UI. *Alternative considered:* HTTP-level assertions on JSON — faster and more stable, but proves nothing about the rendered surface. We accept the extra flakiness/cost of a browser for the user-journey fidelity it gives. (Phase 2.5's widget contract check is the one exception — pure network, using Playwright's API-request context, no browser.)

**2. Redirect external integrations at the network edge via env-configured base URLs; keep the real DB.**
The database stays real (local Postgres via the Neon proxy, already URL-configurable). Garmin and Resend get redirected to a fake backend by making their base URLs env-configurable — using each SDK's own setting where it exists, adding a minimal env seam where it does not. *Alternatives considered:* (a) env-flag fake modules branching inside `lib/garmin.js`/`lib/email.js` — simplest but bakes test-only branches into production code paths; (b) full dependency-injection refactor — cleanest long-term but more change than warranted now. Edge redirection keeps production logic untouched while isolating all "lie to the app" machinery at the boundary. **Phase 1 exercises none of this** — auth touches only the DB — but the decision is recorded here because it shapes the later phases the skeleton must support.

**3. Unique-user-per-test isolation over shared fixtures or DB reset.**
Each test registers a fresh, unique email so parallel tests never touch each other's rows. Rationale: Playwright runs tests in parallel by default, the app's flows revolve around a single user, and this avoids both global DB resets (slow, serializes the suite) and rolled-back-transaction tricks (awkward across a separate server process). *Trade-off:* test data accumulates in the local DB; acceptable because it's a disposable local/CI database, and a coarse cleanup can be added later if needed.

**4. App booted by Playwright's managed web server.**
Playwright's config starts the app the way `vercel dev` runs it, in test configuration via env vars, and waits for a readiness signal before tests run. Rationale: one source of truth for "is the app up," automatic teardown, and no hand-rolled process management. The e2e run stays separate from `npm test` so the fast unit suite is unaffected.

## Risks / Trade-offs

- **First test is expensive; the rest are cheap.** → Phase 1 is deliberately scoped to the minimum that stands up the whole skeleton (auth-only, no fakes), so the heavy lift lands once and later phases are incremental.
- **Browser tests are flakier than unit tests** (timing, readiness, async render). → Mitigate with Playwright's auto-waiting/web-first assertions, a real readiness gate on app boot, and functional-only assertions (no pixel diffs).
- **Real local Postgres is an environmental prerequisite** the suite can't run without. → Reuse the existing `docker-compose` stack; document the prerequisite; the suite fails fast with a clear message if the DB isn't reachable.
- **Accumulating test users in the local DB.** → Unique emails keep tests correct regardless; a cleanup step is a later option, not a blocker.
- **Parallelism could still contend on shared global state** (e.g., a single sync cooldown) in later phases. → Not a Phase 1 concern (auth has no such shared state); flagged for Phase 2 design.

## Roadmap (out of scope for this change)

Each phase below is its own future OpenSpec change, built on this skeleton. Listed for context only.

- **Phase 2 — Garmin connect + happy-path sync.** Adds the fake backend, the Garmin base-URL seam, and a control endpoint to script step data. Connect → sync → steps land in DB and render on the dashboard → disconnect.
- **Phase 2.5 — Widget/API contract.** Network-level (Playwright API-request context, no browser): create an API key, call `GET /api/widget`, assert its streak/freezes/today's-steps agree with `GET /api/steps` for the same user. Depends on Phase 2 (needs a synced user) plus the API-key creation flow.
- **Phase 3 — Garmin failure injection.** Reuses Phase 2's control endpoint to script timeouts/errors and asserts graceful degradation (cooldown respected, streak intact, error surfaced).
- **Phase 4 — Password reset.** Adds the Resend fake + email capture (read the reset link via a control endpoint), exercising request → reset → login with the new password. Self-contained; could precede Phase 2 if reset bugs hurt more.
- **CI wiring.** A CI job that brings up `docker-compose`, applies migrations, installs browsers, and runs the e2e suite — added once the suite has enough coverage to be worth gating on.
