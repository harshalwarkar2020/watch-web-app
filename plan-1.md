# Plan: EPMCDMETST-67287 – Enforce max password bytes (bcrypt 72) on auth

_Repo: https://github.com/harshalwarkar2020/watch-web-app_

_Jira: https://jiraeu.epam.com/browse/EPMCDMETST-67287_

---

## 1) Restatement (objective)
Password validation currently enforces a minimum length but no maximum, and it measures length in UTF-16 code units. bcrypt only considers the first 72 bytes, which can cause silent truncation and ambiguous passwords. The app also allows very large passwords up to the request body limit, so we can end up hashing/comparing huge inputs.

This task adds byte-based max password length enforcement for *registration* and a fail-fast oversized-input rejection path for *login* (return 400 before calling bcrypt). It also adds a max username length rule, mirrors limits client-side, and adds tests and docs.

---

## 2) Source ticket key details (fetched from Jira)
- *Key*: EPMLCDMETST-67287
- *Summary*: Enforce max password bytes (bcrypt 72) on auth
- *Impacted files/lines* (per ticket):
  - `backend/src/middleware/validateCredentials.js`
  - `backend/src/routes/auth.js`
  - `frontend/src/hooks/useCredentialsForm.js`
  - Tests: validateCredentials.test.js, register.test.js, login.test.js, and frontend Vitest tests
  - Docs: docs/api.md or README.md

---

## 3) Assumptions (explicit, no new requirements invented)
- Backend uses Jest for tests (ticket AC mentions Jest).
- Frontend uses Vitest for tests (ticket AC mentions Vitest).
- Login *max password bytes* cap is not specified by a number in the AC; the ticket calls out a risk of lockout if we enforce 72 bytes on login. We will require a product decision on the login cap number before finalizing the implementation (see Open Questions).