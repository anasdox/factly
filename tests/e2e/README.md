# E2E Tests (Playwright)

This directory contains browser-based end-to-end tests for UI behaviors that cannot be reliably covered by the Node-based `tests/blackbox` suite.

## Install

```bash
cd tests/e2e
npm install
npx playwright install
```

## Run

```bash
npm test
```

Run a single spec:

```bash
npm run test:output-management
```

## Scope

- Use `tests/blackbox/` for backend/API/domain acceptance tests (Node + Jest).
- Use `tests/e2e/` for UI interaction workflows (browser rendering, hover, modal flows, drag, etc.).
