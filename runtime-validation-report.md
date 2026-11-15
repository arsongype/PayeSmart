# Runtime Validation Report

**Generated**: 2026-11-14T12:36:00+03:00
**Target**: `D:\PayeSmart`

## Summary

| Step | Status | Exit Code | Details |
|---|---|---:|---|
| Backend unit tests | PASS | 0 | 14 files, 75 tests passed |
| Backend HTTP end-to-end | PASS | 0 | Nest application module test passed (1/1) |
| Backend build and lint | PASS | 0 | Nest build and Oxlint passed |
| Frontend build and lint | PASS | 0 | TypeScript/Vite build and ESLint passed |
| Browser E2E | PASS | 0 | 5 Playwright tests passed across registration, password recovery, and protected routes |
| AI service tests and compile | PASS | 0 | 12 Python tests passed; `compileall` passed |
| Live readiness and auth checks | PASS | 0 | Backend API HTTP 200; unauthenticated `/auth/me` HTTP 401; AI `/health` HTTP 200 |
| Stripe signup setup | BLOCKED | 0 | Endpoint returns HTTP 503 because Stripe keys are not configured |

**Overall**: NEEDS_SIGNOFF — automated suites and local readiness checks pass, but Stripe card registration cannot be exercised without Stripe test keys. Authenticated business journeys are not covered by the available E2E tests.

## Test Evidence

- Backend: `npm test` — 75 passed; `npm run test:e2e` — 1 passed; `npm run build` and `npm run lint` passed.
- Frontend: `npm run build`, `npm run lint`, and `npm run test:e2e` passed; 5 browser tests.
- AI service: `python -m unittest discover -v` — 12 passed; `python -m compileall -q .` passed.
- Live probes: `GET /api/v1` → 200; `GET /api/v1/auth/me` without credentials → 401; `GET /health` → 200; signup SetupIntent with valid email → 503 while Stripe is unconfigured.
- Database: the additive local migration completed successfully in the previous step. No test accounts or business transactions were created.

## Environment and Gaps

- Node.js v24.14.0, Python 3.12.10, and Playwright/Chromium are available.
- Docker is not installed. Local PostgreSQL was available for the additive migration; Redis port 6379 is closed.
- The running backend and AI service returned healthy responses. The backend correctly rejects unauthenticated access.
- Stripe test keys are absent, so no actual card confirmation, Visa-brand verification, Stripe customer attachment, or persisted linked-card read-back was tested. The browser test verifies the registration paths and the required confirmation gate with Stripe unavailable.
- No authenticated test account/cleanup fixture is available; payment, KYC/KYB upload, admin review, and account lifecycle browser flows remain unverified.
- AI tests use demonstration scenarios and do not establish model accuracy on real transactions.

```text
environment:
  docker: UNAVAILABLE — Docker CLI not installed
  node: AVAILABLE — v24.14.0
  python: AVAILABLE — 3.12.10
  playwright: AVAILABLE — 5 browser tests passed
  infra-tier: FALLBACK(local PostgreSQL; Redis unavailable) — Docker not installed; Redis port 6379 closed
  browser-tier: PRIMARY(Playwright)
startup: PASS — live backend API HTTP 200 and AI /health HTTP 200
integration: PASS — exit_code: 0, backend unit 75/75, backend HTTP E2E 1/1, AI 12/12; Stripe endpoint blocked by missing configuration
e2e: PARTIAL — exit_code: 0, 5 passed; public registration/password-recovery/protected-route flows; authenticated business flows and real Stripe card setup unverified
overall: NEEDS_SIGNOFF — Stripe keys and authenticated test data are required for full end-to-end business-flow verification
```
