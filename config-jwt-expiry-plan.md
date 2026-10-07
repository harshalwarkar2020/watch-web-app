# E5 Auth Hardening: Configurable JWT Expiry + Standardized Auth Errors (Plan)

## Goal
- Make JWT expiry configurable via env var `JWT_EXPIRES_IN` with safe default `1h` (current behavior).
- Standardize auth-failure responses from `requireAuth` middleware (consistent 401 + error shape).

## Scope

### In-scope
- `backend/src/jwtService.js`: support `JWT_EXPIRES_IN` with default `1h`; pass to JWT library as `expiresIn`.
- `backend/src/middleware/requireAuth.js`: consistent HTTP 401 for missing/invalid/expired tokens with standard error body.
- Tests covering configurable expiry and standardized auth errors.

### Out of scope
- Refresh tokens
- Logout/revocation
- Session/cookie-based auth

## Standard auth error behavior (definitive)
- HTTP status: `401 Unauthorized` for all `requireAuth` auth failures.
- Body shape:
  ```json
  {
    "error": {
      "code": "AUTH_REQUIRED|AUTH_INVALID|AUTH_EXPIRED",
      "message": "Authentication required|Invalid token|Token expired"
    }
  }