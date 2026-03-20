## Context

The app currently stores a single plaintext API key per user directly on the `users` table. This key is used by the Garmin widget to fetch streak data without a session cookie. The key can be retrieved via GET endpoint and never expires. This needs to be replaced with secure, industry-standard key management.

## Goals / Non-Goals

**Goals:**
- Store API keys as SHA-256 hashes (never retrievable in plaintext after creation)
- Support multiple keys per user (up to 3) with optional naming
- Enforce 365-day expiration on all keys
- Track last usage time per key
- Clean migration path (invalidate existing keys, remove old column)

**Non-Goals:**
- Key rotation (auto-replace expiring keys) — users manually create new ones
- Rate limiting on API endpoints
- Key scoping (all keys have the same permissions)
- Encryption at rest beyond hashing

## Decisions

### 1. SHA-256 hashing (not bcrypt)

API keys are high-entropy random strings (32 bytes / 64 hex chars), so brute-force is infeasible. SHA-256 is sufficient and allows O(1) lookup by hash during validation. bcrypt would require loading all keys and comparing one-by-one, which doesn't scale.

### 2. Separate `api_keys` table

A dedicated table with `user_id` foreign key rather than columns on `users`. This naturally supports multiple keys and keeps concerns separated.

```
api_keys
├── id            INTEGER PRIMARY KEY AUTOINCREMENT
├── user_id       INTEGER NOT NULL → users(id)
├── name          TEXT (nullable)
├── key_hash      TEXT NOT NULL UNIQUE
├── prefix        TEXT NOT NULL (first 8 chars of plaintext)
├── created_at    TEXT NOT NULL (ISO 8601)
├── expires_at    TEXT NOT NULL (ISO 8601, created_at + 365 days)
└── last_used_at  TEXT (nullable, ISO 8601)
```

### 3. Prefix stored for identification

Store the first 8 characters of the plaintext key so users can identify keys in the list view. 8 chars of a hex string = 4 bytes of entropy, enough to distinguish up to 3 keys visually.

### 4. Hard limit of 3 keys per user

Enforced at the application level on creation. Simple COUNT query before INSERT.

### 5. Expiration check at validation time

No background cleanup job. Expired keys are rejected during validation (`expires_at < now()`). Users can delete expired keys manually from the UI.

## Risks / Trade-offs

- **Existing users lose their key** → Acceptable per decision. Users must generate a new key and reconfigure Garmin widget. Low user count makes this manageable.
- **No key retrieval** → If a user loses their key, they must delete and create a new one. This is the intended security behavior.
- **Clock skew on expiration** → Server clock is authoritative. Not a concern for a single-server app.

## Migration Plan

1. Create `api_keys` table
2. Update API endpoints (`/api/apikey`) and widget validation (`/api/widget`)
3. Update frontend UI for multi-key management
4. Drop `api_key` column from `users` table
5. Rollback: re-add column and restore old endpoints (but keys are lost regardless)