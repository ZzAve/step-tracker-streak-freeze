## 1. README documentation

- [x] 1.1 Add an "Environments" subsection under `## Deployment` in `README.md` explaining per-environment `DATABASE_URL` scoping (Production → prod Neon branch, Preview → shared persistent Neon `preview` branch, Development → local Docker via the `NODE_ENV` override)
- [x] 1.2 Note that automatic startup migrations run against the scoped database, so preview migrations never touch production
- [x] 1.3 Document that `TOKEN_ENCRYPTION_KEY` is likewise scoped per environment
- [x] 1.4 Include the operational steps (create Neon `preview` branch; set Preview-scoped vars in Vercel; redeploy) and the "Reset from parent" note for refreshing preview data

## 2. .env.example notes

- [x] 2.1 Add a comment to `.env.example` clarifying that on Vercel `DATABASE_URL` and `TOKEN_ENCRYPTION_KEY` must be set per environment scope (Production vs Preview), and that the file itself represents local development values

## 3. Verification

- [x] 3.1 Confirm no application code changed (`git diff` touches only docs)
- [x] 3.2 Re-read the README/`.env.example` sections for accuracy against `lib/db.js` behaviour (`NODE_ENV==='development'` override; `DATABASE_URL` used directly otherwise)
