## Context

The project declares `engines.node: "24.x"` in `package.json` but CI was configured to use Node 20, creating an EBADENGINE mismatch warning on every `npm ci` run.

Three transitive dependencies emit deprecation warnings:
- `glob@11.1.0` — pinned by `node-pg-migrate@8.0.4` via `~11.1.0`; npm itself warns this version has security vulnerabilities.
- `tar@7.5.7` — hard-pinned by `@vercel/fun@1.3.0`; deprecated for the same reason.
- `crypto@1.0.1` — pulled in by `garmin-connect@1.6.2`; this package is a no-op shim that re-exports Node's built-in `crypto`, deprecated because the built-in is preferred.

## Goals / Non-Goals

**Goals:**
- Eliminate the EBADENGINE warning by aligning CI with the declared engine.
- Eliminate glob and tar deprecation warnings via npm overrides without touching the packages that require them.
- Check if a newer `garmin-connect` release removes the `crypto` dep.

**Non-Goals:**
- Fixing the `crypto@1.0.1` warning if no upstream fix exists (no harm, requires upstream PR to `garmin-connect`).
- Upgrading `node-pg-migrate` or `@vercel/fun` directly (overrides are sufficient and safer).
- Changing any production logic or API behavior.

## Decisions

**1. npm overrides rather than direct dep bumps.**
`glob` and `tar` are transitive — they're not in our direct `dependencies`/`devDependencies`. Using npm `overrides` forces a specific version across the entire dependency tree without modifying the packages that require them. This is the standard npm approach for fixing transitive vulnerabilities/deprecations.

**2. Node 24 in CI, not >=20.**
The user explicitly wants Node 24 as the target runtime. Matching CI to the declared `engines.node` (rather than relaxing `engines.node` to `>=20`) ensures tests actually run on the correct platform.
