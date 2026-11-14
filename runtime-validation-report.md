# Runtime Validation Report

**Generated**: 2026-11-13T09:57:30+03:00  
**Target**: `D:\PayeSmart`

## Summary

| Step | Status | Exit Code | Details |
|---|---|---:|---|
| Backend unit tests | PASS | 0 | 12 files, 70 tests passed |
| Backend HTTP end-to-end | PASS | 0 | AppModule startup and root endpoint test passed (1/1) |
| Backend build and lint | PASS | 0 | Nest build and Oxlint passed |
| AI service tests and compile | PASS | 0 | 8 tests passed; Python compileall passed |
| Frontend build and lint | PASS | 0 | TypeScript/Vite build and ESLint passed |
| Browser E2E | PASS | 0 | 3 Playwright tests passed |
| Local readiness/auth checks | PASS | 0 | Backend and AI health 200; backend unauthenticated route 401; invalid AI key 403 |

**Overall**: NEEDS_SIGNOFF — all executed checks passed, but authenticated payment and KYC/KYB journeys and real-world AI model quality were not verified.

## Coverage

- **Payments**: payment service unit tests cover channel contracts, KYC/KYB eligibility gates, risk thresholds, fraud blocking/alert creation, and notification OTP behavior. The OTP expiry test now uses a fixed clock to avoid a 1 ms timing race.
- **KYC/KYB**: payment eligibility is covered, but no dedicated backend KYC/KYB document upload, AI analysis, review, or persistence test suite exists. No authenticated KYC/KYB browser flow was run.
- **Fraud alerts**: unit tests cover high-risk blocking and alert notification/persistence calls with mocked dependencies; no authenticated admin investigation/review flow was run.
- **AI models**: 8 local tests cover synthetic approve/2FA/block scenarios, threshold alignment, and Random Forest/XGBoost predictions. The live metrics endpoint responded, but precision, recall, and F1 were unset and counters were zero. There is no labeled evaluation dataset, so model accuracy on real transactions is not established.
- **Frontend**: Playwright covered registration navigation, payment-route protection, and password recovery validation; it did not cover signed-in payment/KYC/KYB/admin workflows.

## Environment and Gaps

- Node.js v24.14.0 and Playwright/Chromium were available.
- Docker CLI was unavailable. PostgreSQL was listening locally; Redis port 6379 was closed, so no Docker- or Redis-backed integration run was performed.
- Local service health checks did not create or alter business records. No real payment provider or production data was used.
- Authenticated flows require an isolated test account and cleanup strategy; these were not available, so no payment, document, or fraud-review records were created in the shared local database.

```text
environment:
  docker: UNAVAILABLE — Docker CLI missing
  node: AVAILABLE — v24.14.0
  playwright: AVAILABLE — 3 browser tests passed
  infra-tier: FALLBACK(local PostgreSQL; Redis unverified) — Docker unavailable; Redis closed
  browser-tier: PRIMARY(Playwright)
startup: PASS — backend and AI local health checks returned HTTP 200; Playwright started/reused the frontend successfully
integration: PASS — exit_code: 0, backend unit 70/70; backend HTTP E2E 1/1; AI tests 8/8
e2e: PARTIAL — exit_code: 0, 3 passed; public/auth navigation and validation only; authenticated business flows not exercised
overall: NEEDS_SIGNOFF — KYC/KYB authenticated flows and empirical AI model evaluation remain unverified
```
