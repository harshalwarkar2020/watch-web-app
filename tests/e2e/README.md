# E2E (Playwright)

## Install
From repo root:

```bash
npm i -D @playwright/test
npx playwright install
```

## Run
```bash
npx playwright test
```

## Report
```bash
npx playwright show-report
```

## Notes
- `playwright.config.ts` starts both backend and frontend dev servers.
- Override base URL:

```bash
E2E_BASE_URL=http://localhost:5173 npx playwright test
```
