## Why

API keys are currently stored in plaintext on the `users` table, retrievable via GET endpoint, limited to one per user, and never expire. This is insecure — anyone with database access can see all keys, and compromised keys live forever. We need proper key management following industry best practices.

## What Changes

- **BREAKING**: Remove `api_key` column from `users` table; existing keys are invalidated
- New `api_keys` table with hashed key storage (SHA-256), expiration, optional naming, and usage tracking
- Users can create up to 3 API keys, each valid for 365 days
- Keys are shown once at creation and cannot be retrieved again
- Users can list their keys (showing only prefix, name, dates) and delete them
- Widget endpoint updated to validate keys against hashed storage and check expiration
- `last_used_at` tracking updated on each key usage

## Capabilities

### New Capabilities
- `api-key-management`: Secure API key lifecycle — creation (with hashing), listing (metadata only), deletion, expiration, and usage tracking

### Modified Capabilities
- `data-sync`: Widget endpoint authentication changes from plaintext key lookup to hash-based lookup with expiration check

## Impact

- **API**: `GET/POST/DELETE /api/apikey` endpoints redesigned
- **Database**: New `api_keys` table, `api_key` column removed from `users`
- **Widget**: `/api/widget` authentication logic updated
- **Frontend**: New dedicated API keys page (`/keys`) with multi-key management, show-once flow, naming, deletion, and explanation of Garmin widget integration. Navigation links between dashboard and keys page.
- **Garmin widget**: Users must generate a new key and reconfigure their widget