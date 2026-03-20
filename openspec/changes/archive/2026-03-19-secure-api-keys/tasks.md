## 1. Database

- [x] 1.1 Create `api_keys` table (id, user_id, name, key_hash, prefix, created_at, expires_at, last_used_at)
- [x] 1.2 Drop `api_key` column from `users` table

## 2. API Key Endpoints

- [x] 2.1 Implement POST `/api/apikey` — generate key, hash with SHA-256, store hash, return plaintext once. Enforce 3-key limit. Accept optional `name` in body.
- [x] 2.2 Implement GET `/api/apikey` — return list of user's keys with id, name, prefix, created_at, expires_at, last_used_at (never return key or hash)
- [x] 2.3 Implement DELETE `/api/apikey/:id` — delete key only if it belongs to the authenticated user

## 3. Widget Authentication

- [x] 3.1 Update `/api/widget` to validate keys by hashing and looking up in `api_keys` table
- [x] 3.2 Add expiration check (reject if `expires_at < now()`)
- [x] 3.3 Update `last_used_at` on successful validation

## 4. Frontend

- [x] 4.1 Create dedicated `/keys` page with explanation text about Garmin widget integration
- [x] 4.2 Add key list view on keys page (name, prefix, created_at, expires_at, last_used_at)
- [x] 4.3 Add "create key" flow with optional name input, showing plaintext key once with copy button
- [x] 4.4 Add delete button per key with confirmation
- [x] 4.5 Add navigation link from dashboard to keys page and back
- [x] 4.6 Add auth guard — redirect unauthenticated users to login