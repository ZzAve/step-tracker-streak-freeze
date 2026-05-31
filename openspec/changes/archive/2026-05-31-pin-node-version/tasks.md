## 1. Pin the Node version

- [x] 1.1 Confirm `.nvmrc` holds the exact pinned version (`v24.14.0`) as the single source of truth
- [x] 1.2 Set `package.json` `engines.node` to `24.x`
- [x] 1.3 Update `.github/workflows/claude.yml` to use `node-version-file: '.nvmrc'` instead of `node-version: '20'`

## 2. Verification

- [x] 2.1 `.nvmrc` is the single source of truth that `nvm use` and CI both read (note: this ephemeral container ships Node v22; the pin governs local/CI/Vercel)
- [x] 2.2 Verify `npm test` passes on the installed dependencies (50/50 passing)
- [x] 2.3 Confirm `24.x` is a supported Vercel function runtime (GA per Vercel changelog)
