## 1. Fix register.js

- [x] 1.1 In `api/auth/register.js`, change the duplicate-email response from `res.status(409).json({ error: 'Email already registered' })` to `res.status(200).json({ ok: true })` with a comment `// Always 200 to prevent user enumeration`

## 2. Fix migrate.js

- [x] 2.1 In `api/auth/migrate.js`, change the "no account found" response from `res.status(404).json({ error: 'No account found for this email' })` to `res.status(401).json({ error: 'Invalid Garmin credentials' })` with a comment `// Return same error as invalid Garmin credentials to prevent user enumeration`

## 3. Clean up register.html

- [x] 3.1 In `public/register.html`, remove the dead `if (data.error === 'Email already registered')` branch, collapsing to just `errorEl.textContent = data.error || 'Registratie mislukt'`

## 4. Update tests

- [x] 4.1 In `api/auth/register.test.js`, update the test "returns 409 when email already registered" to assert status `200` and body `{ ok: true }`, and rename it to reflect the new behaviour
- [x] 4.2 In `api/auth/migrate.test.js`, update the test "returns 404 when no account found" to assert status `401`, and rename it to reflect the new behaviour
