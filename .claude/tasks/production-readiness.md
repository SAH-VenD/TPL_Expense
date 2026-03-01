# Production Readiness & Security Hardening

## Status: IN PROGRESS
**Branch:** `feat/production-readiness`
**Started:** 2026-03-01
**Plan:** `/Users/saadhashmi/.claude/plans/ancient-percolating-newt.md`

---

## Phase 1: ESLint Warning Fixes - COMPLETE

### 1A. Fix `no-explicit-any` (6 warnings) - DONE
- Created `packages/web/src/utils/error.ts` with `getApiErrorMessage()` utility
- Fixed `ApprovalQueuePage.tsx` - 4 instances of `error: any` replaced
- Fixed `VoucherDetailPage.tsx` - 1 instance replaced
- Fixed `VoucherRequestPage.tsx` - 1 instance replaced

### 1B. Fix `exhaustive-deps` (4 warnings) - DONE
- Fixed `UsersPage.tsx` - wrapped `users` in `useMemo`
- Fixed `ExpenseListPage.tsx` - wrapped `expenses` in `React.useMemo`
- Fixed `VoucherListPage.tsx` - wrapped `statusCounts` in `useMemo`

### Verification
- Lint: 0 warnings (was 10/10)
- Build: pending (will verify after Phase 2)
- Tests: pending

---

## Phase 2: Security Hardening - IN PROGRESS

### 2A. npm Vulnerability Remediation - PENDING
- Run `npm audit fix`
- Add `overrides` for transitive deps
- Target: 0 critical, 0 high

### 2B. File Upload Magic Bytes Validation - PENDING
- Create `packages/api/src/common/utils/file-validation.ts`
- Add magic byte checks for JPEG, PNG, PDF, HEIC
- Add tests

### 2C. Startup Environment Variable Validation - PENDING
- Create `packages/api/src/common/config/env-validation.ts`
- Add Zod schema for required env vars
- Wire into `main.ts`

### 2D. OCR Endpoint Authorization Fix (IDOR) - PENDING
- Add `@CurrentUser()` to processOcr and getOcrData
- Add ownership check in service
- Add tests

---

## Phase 3: Bundle Optimization - PENDING

### 3A. Lazy-Load Route Pages
- Convert 29 eager imports to `React.lazy()` in `App.tsx`
- Add `Suspense` fallback

### 3B. Vite Manual Chunks
- Add `manualChunks` config in `vite.config.ts`
- Split vendor libs into cacheable chunks

---

## Phase 4: CI/CD Pipeline - PENDING
- Create `.github/workflows/ci.yml`
- Jobs: lint-and-build, test-api, test-web

---

## Phase 5: E2E Tests in CI - PENDING
- Add test-e2e-api job with PostgreSQL service container
- Use `--runInBand` for sequential execution

---

## Files Modified

| File | Phase | Status |
|------|-------|--------|
| `packages/web/src/utils/error.ts` | 1A | Created |
| `packages/web/src/pages/approvals/ApprovalQueuePage.tsx` | 1A | Done |
| `packages/web/src/pages/vouchers/VoucherDetailPage.tsx` | 1A | Done |
| `packages/web/src/pages/vouchers/VoucherRequestPage.tsx` | 1A | Done |
| `packages/web/src/pages/admin/UsersPage.tsx` | 1B | Done |
| `packages/web/src/pages/expenses/ExpenseListPage.tsx` | 1B | Done |
| `packages/web/src/pages/vouchers/VoucherListPage.tsx` | 1B | Done |
