## Why

`npm ci` emits several warnings in CI and local dev:

1. **`EBADENGINE`** — `engines.node` was `24.x` but CI ran Node 20, causing a version mismatch warning.
2. **`glob@11.1.0` deprecated** — `node-pg-migrate` depends on the deprecated `glob` version.
3. **`tar@7.5.7` deprecated** — `@vercel/fun` depends on the deprecated `tar` version.
4. **`crypto@1.0.1` deprecated** — `garmin-connect` depends on the deprecated `crypto` npm shim.

These warnings are noise in CI output and indicate using unmaintained packages. The node version mismatch also means CI isn't testing against the declared target runtime.

## What Changes

- Update CI (`ci.yml`) to run Node 24, matching the `engines.node: "24.x"` declared in `package.json`.
- Add `npm overrides` in `package.json` to replace deprecated transitive deps:
  - `glob` → `^13.0.0` (resolves `node-pg-migrate`'s pinned `glob@11.1.0`)
  - `tar` → `>=7.5.8` (resolves `@vercel/fun`'s pinned `tar@7.5.7`)
- The `crypto@1.0.1` warning from `garmin-connect` requires an upstream fix; this change documents the issue and checks for a newer `garmin-connect` release.

## Capabilities

### Modified Capabilities
<!-- No product capabilities change; this is CI and build tooling only. -->

## Impact

- CI now runs on Node 24, eliminating the `EBADENGINE` warning and ensuring tests run against the declared runtime.
- Two of four deprecated dependency warnings are eliminated via npm overrides.
- No production code changes; only CI config and `package.json`/`package-lock.json`.
