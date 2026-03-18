# Playwright E2E

## Preconditions
- Frontend is running at `http://localhost:3000`
- Backend is running at `http://localhost:4000`
- Admin account exists: `admin/admin`

## Install
```bash
npm i
npx playwright install chromium
```

## Run
```bash
npm run test:e2e
```

## Optional env
- `E2E_BASE_URL` (default: `http://localhost:3000`)
- `E2E_API_BASE_URL` (default: `http://localhost:4000`)
