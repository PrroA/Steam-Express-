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

Run the interview showcase checks after `npm run dev` is already running:

```bash
npm run test:showcase
```

Run only the core demo smoke flow:

```bash
npm run test:e2e:demo
```

`test:e2e:demo` covers the interview demo path: authenticated cart setup, AI cart review, checkout, order redirect, Demo quick pay, and final paid order status.

Run only the AI showcase smoke flow:

```bash
npm run test:e2e:ai
```

`test:e2e:ai` covers the visible AI showcase path: AI customer support, product buying advice, and product comparison advice.

Run the user-facing copy guard:

```bash
npm run test:e2e:copy
```

`test:e2e:copy` checks core customer pages for engineering terms such as `API`, `server`, `token`, and `PaymentIntent`.

## Optional env
- `E2E_BASE_URL` (default: `http://localhost:3000`)
- `E2E_API_BASE_URL` (default: `http://localhost:4000`)
