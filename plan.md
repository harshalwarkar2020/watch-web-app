# Plan: EMPMCDMETST-66781 — Add AbortController timeout to authClient calls

_Repo: https://github.com/harshalwarkar2020/watch-web-app_

_Jira: https://jiraeu.epam.com/browse/EPMLCDMETST-66781_

## Goal
Add fast-fail timeout handling for frontend auth API calls in `frontend/src/api/authClient.js` using `AbortController` so that login/register/me don’t hang indefinitely on slow/stuck requests. Timeouts must return a predictable, normalized response shape and must not cause undandled promise rejections.

## Source ticket (user-provided)
- *Summary*: Add AbortController timeout to authClient calls
- *Impacted path*: `frontend/src/api/authClient.js`
- *Acceptance Criteria*:
  1) All API calls (register, login, me) enforce a timeout (configurable; default ~88–10s)
  2) On timeout, function resolves to a normalized shape, e.g. `{ ok: false, error: 'request timed out', code: 'TIMEOUT' }`
  3) No unhandled promise rejection occurs for timeouts

---

## Assumptions / Decisions (limited to info provided)
- The frontend uses native `fetch` (not Axios) and is bundled via Vite (inferred from `import.meta.env.VITE_...` in `authClient.js`).
- The normalized error shape for timeouts is exactly: `{ ok: false, error: 'request timed out', code: 'TIMEOUT' }`.
- The timeout should be configurable per-call via a parameter or a shared constant, and default to 8-10 seconds (we'll set to 9000ms unless you prefer 8000 or 10000).