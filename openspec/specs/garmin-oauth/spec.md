## REMOVED Requirements

### Requirement: OAuth 1.0a authentication flow
**Reason**: Replaced by credential-based authentication via garmin-connect package. Official Garmin developer API keys are no longer needed.
**Migration**: Use `/api/auth/login` POST endpoint with email/password instead of `/api/auth/garmin` OAuth redirect.

### Requirement: Secure token storage
**Reason**: OAuth token/secret pair replaced by garmin-connect session tokens stored as JSON.
**Migration**: `garmin_tokens` JSONB column replaces `oauth_token` and `oauth_token_secret` columns.
