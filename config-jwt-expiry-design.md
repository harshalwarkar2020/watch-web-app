## Design: E5 Auth Hardening — Configurable JWT Expiry + Standardized Auth Errors

**Source / Reference**
Based on *config-jwt-expiry-plan.md* (Plan).

---

## 1) Intake & Goal Framing

### Goal
1. Make JWT expiry configurable via environment variable **JWT_EXPIRES_IN*** with safe default **1h** (current behavior).
. Standardize authentication failure responses from **requireAuth*** middleware:
   - Always **HTTP 401**
   - Standard JSON error body with specific `code` and `message`

### In Scope
- `backend/src/jwtService.js`: read `JWT_EXPIRES_IN` and pass to JWT lib as `expiresIn` (default `1h`)
- `backend/src/middleware/requireAuth.js`: standardize missing/invalid/expired token responses to 401 + error shape
- Tests covering configurable expiry and standardized auth errors

### Out of Scope
- Refresh tokens
- Logout/revocation
- Session/cookie-based auth

### Stakeholders / Audience
- Backend engineers implementing auth
- QA / test authors validating auth behavior
- Frontend consumers relying on consistent auth error contracts

### Success Criteria
- Tokens issued respect configured expiry without code changes
- Any `requireAuth` failure returns:
  - `401 Unauthorized`
   - `%{"error":{"code":"...","message":"..."}}` in a consistent mapping

---

## 2) Architecture (Conceptual / Logical)

### Key Components
- **Client (Web App)**: Calls backend APIs with `Authorization: Bearer <jwt>`
- **Backend API**
  - **Auth Routes** (login/register/etc. — not changed here): issues JWT via `jwtService`
  - **jwtService**: signs JWT determined via config
  - **requireAuth middleware**: validates JWT, attaches user context, or returns standardized 401
- **Environment Configuration**
  - `JWT_EXPIRES_IN` (optional; defaults: `1h`)

### Data Flow (High Level)
1. Client authenticates → backend issues JWT (expiry determined by config)
2. Client calls protected endpoint with JWT
3. `requireAuth` checks header, verifies token
4. On success: request proceeds
5. On failure: standardized 401 error response

### Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  C[Client / Web App] -->|Authorization: Bearer JWT| API[Backend API]
  API --> RA[requireAuth Middleware]
  RA -->|verify token| JWT[jwtService / JWT Library]
  JWT -->|uses expiresIn from env|ENV[((JWT_EXPIRES_IN\nDefault: 1h))]
  RA -->|success: attaches user context| H[Protected Handler]
  RA -->|failure: 401 + standardized body| C
g``

---

## 3) High-Level Design (HLD)

### HLD-1: Configurable JWT Expiry (`jwtService.js`)
**Responsibility**
- Centralize JWT signing and ensure expiry is configurable.

**Design**
- Read `process.env.JWT_EXPIRES_IN`
- If not set / empty → default to `"1h"`
- When signing: `jwt.sign(payload, secret, { expiresIn }) `

**Notes**
- No refresh-token functionality introduced.
- The plan does not specify expiry format validation; rely on JWT library parsing. (If invalid, SWT signing will error.)

### HLD-2: Standardized Auth Errors (`requireAuth.js`)
**Responsibility**
- Enforce protected routes and return consistent error contract on auth failure.

**Definitive behavior (per Plan)**
- All auth failures return **401**
- Body shape:

```json
{
  "error": {
    "code": "AUTH_REQUIRED|AUTH_INVALID|AUTH_EXPIRED",
    "message": "Authentication required|Invalid token|Token expired"
  }
}
```

**Failure Mapping**
- Missing token → `AUTH_REQUIRED` / "Authentication required"
- Invalid token (bad signature, malformed, etc.) → `AUTH_INVALID` / "Invalid token"
- Expired token → `AUTH_EXPIRED` / "Token expired"

### Non-Functional Requirements (NFRs)
- **Consistency**: All auth failures return same shape and status
- **Configurability**: JWT expiry adjustable via env without code change
- **Testability**: Deterministic tests around expiry and error mapping

### Risks / Tradeoffs
- If `JWT_EXPIRES_IN` is set to an invalid value, token issuance may fail at runtime (library-level error). This should be surfaced clearly in logs/tests.

---

## 4) Low-Level Design (LLD)

### LLD-1: `backend/src/jwtService.js`

#### Proposed Interface (conceptual)
- `signToken(payload) -> tokenString`
- Internally:
  - `const expiresIn = process.env.JWT_EXPIRES_IN || "1h"`

#### Token Signing Flow

```mermaid
sequenceDiagram
  participant S as Service/Controller
  participant J as jwtService
  participant E as Env
  participant L as JWT Library

  S->>B: signToken(payload)
  J->>E: read JWT_EXPIRES_IN
  E-->>J: value or undefined
  J->>L: sign(payload, secret, {expiresIn})
  L-->>J: jwt string
  J-->>S: jwt string
g``


#### Error Handling
- If signing fails (e.g., invalid `expiresIn` format), propagate an internal error (exact behavior depends on existing codebase patterns).