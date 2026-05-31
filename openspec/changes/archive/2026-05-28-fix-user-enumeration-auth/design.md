## Design: Fix User Enumeration in Auth Endpoints

### register.js

**Current behaviour:** Returns `409 { error: 'Email already registered' }` when the email already exists in `users`.

**New behaviour:** Return `200 { ok: true }` (no session cookie set). The caller receives the same response shape as a successful registration, making a duplicate attempt indistinguishable from a fresh one.

```diff
-  if (existing.length > 0) {
-    res.status(409).json({ error: 'Email already registered' });
-    return;
-  }
+  if (existing.length > 0) {
+    // Always 200 to prevent user enumeration
+    res.status(200).json({ ok: true });
+    return;
+  }
```

The successful path still returns 201 with a session cookie; only the duplicate-email short-circuit changes.

### migrate.js

**Current behaviour:** Returns `404 { error: 'No account found for this email' }` when the email has no row in `users`.

**New behaviour:** Return `401 { error: 'Invalid Garmin credentials' }`. This collapses the "no account" case into the same error that is already returned for wrong Garmin credentials, making it impossible to distinguish the two.

```diff
-  if (userResult.length === 0) {
-    res.status(404).json({ error: 'No account found for this email' });
-    return;
-  }
+  if (userResult.length === 0) {
+    // Return same error as invalid Garmin credentials to prevent user enumeration
+    res.status(401).json({ error: 'Invalid Garmin credentials' });
+    return;
+  }
```

### public/register.html

**Current behaviour:** Checks `data.error === 'Email already registered'` to show a Dutch-translated message.

**New behaviour:** That branch is dead code once register.js returns 200. Remove it. The `res.ok` branch already handles a 200 by redirecting to `/`, so no behaviour change for the user — they are sent to the login page.

```diff
-  if (data.error === 'Email already registered') {
-    errorEl.textContent = 'Dit e-mailadres is al geregistreerd';
-  } else {
-    errorEl.textContent = data.error || 'Registratie mislukt';
-  }
+  errorEl.textContent = data.error || 'Registratie mislukt';
```

### Tests

- `api/auth/register.test.js`: Change the "returns 409 when email already registered" test to assert `200` and `{ ok: true }` body.
- `api/auth/migrate.test.js`: Change the "returns 404 when no account found" test to assert `401`.
