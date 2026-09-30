# Book the Watch

A full-stack app implementing user registration and login with JWT-based session
management, built via an agentic SDLC pipeline (see `sdlc-artifacts/` for the full
requirements → architecture → review → implementation → test → PR trail). Backend:
Node.js/Express + SQLite. Frontend: React.

## Prerequisites
- Node.js 20 or higher
- npm

## Running Locally
```bash
cd backend && npm install && cp .env.example .env && npm start
cd frontend && npm install && cp .env.example .env && npm run dev
```
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

## Running Tests
```bash
cd backend && npm test
cd frontend && npm test
```
Current coverage: 97.64% backend, 97.61% frontend (47 tests passing)

## API Quick Reference
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/register | Register a new user |
| POST | /api/login | Log in, returns a JWT |
| GET | /api/me | Return the authenticated username (requires `Authorization: Bearer <jwt>`) |

### Credential validation
Failures return HTTP 400 with `{ "error": "<message>" }`. The frontend mirrors these rules.

| Field | Endpoint | Rule |
|-------|----------|------|
| username | register, login | required, at most 30 characters |
| password | register | at least 8 characters and at most 72 UTF-8 bytes (bcrypt only uses the first 72 bytes) |
| password | login | at most 512 UTF-8 bytes (rejected before `bcrypt.compare` to avoid hashing huge inputs) |

Password limits are measured in UTF-8 bytes, so multi-byte characters (e.g. `é` = 2 bytes) count more than once.

## Known Limitations
- No persistent session across page refresh — JWT is held in-memory only (React Context), a deliberate XSS-hardening tradeoff
- SQLite is a single point of failure / single-writer — fine for this scale, not for concurrent production load
- No rate limiting or brute-force protection on `/api/login` — explicitly out of scope
- No refresh-token flow — sessions expire after 1 hour with no silent renewal
- No production hosting/deployment configuration — targets `localhost` only

## Environment Variables
| Variable | Used in | Purpose |
|---|---|---|
| `JWT_SECRET` | backend | JWT signing secret — required, no default |
| `PORT` | backend | Server port (default 3000) |
| `CORS_ORIGIN` | backend | Allowed frontend origin (default `http://localhost:5173`) |
| `VITE_API_BASE_URL` | frontend | Backend API base URL (default `http://localhost:3000`) |
