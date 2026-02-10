# API Unit Test Coverage Plan

## Goal
Address 13 API service modules at 0% unit test coverage, bringing overall API coverage from ~37% to 55%+ (service-level much higher).

## Branch
`test/api-unit-coverage` (from `main`)

## Results Summary

| Metric | Before | After |
|--------|--------|-------|
| Test Suites | 7 | 20 |
| Total Tests | ~420 | 796 |
| Statement Coverage | ~37% | 55.4% |
| Branch Coverage | ~60% | 76.1% |

---

## Batch 1: Simple CRUD Modules

- [x] `vendors.service.spec.ts` — CRUD, search filtering, normalized name, find-or-create idempotency (~12 tests)
- [x] `projects.service.spec.ts` — auto-generated code, date conversion, active filtering (~12 tests)
- [x] `cost-centers.service.spec.ts` — auto-generated code, soft delete, active-only filter (~10 tests)
- [x] `storage.service.spec.ts` — provider delegation, key generation, filename sanitization (~12 tests)
- [x] `notifications.service.spec.ts` — CRUD, unreadOnly filter, markAsRead ownership, helpers (~14 tests)

## Batch 2: Hierarchical/Tree Modules

- [x] `categories.service.spec.ts` — tree building, circular reference prevention, unique code validation (~37 tests)
- [x] `departments.service.spec.ts` — tree building/sorting, circular refs, deactivation guards, user counts (~38 tests)

## Batch 3: Business Logic Modules

- [x] `expenses.service.spec.ts` — RBAC visibility, exchange rates, expense number gen, email on submit, status guards (~50 tests)
- [x] `pre-approvals.service.spec.ts` — workflow (PENDING->APPROVED/REJECTED), 30-day expiry, PA number gen (~25 tests)
- [x] `admin.service.spec.ts` — DEFAULT_SETTINGS merge, upsert behavior, dashboard aggregation (~25 tests)
- [x] `audit.service.spec.ts` — pagination, filtering, export, helper method delegation (~20 tests)

## Batch 4: Integration-Heavy Modules

- [x] `receipts.service.spec.ts` — file validation (10MB, MIME types), SHA256 dedup, S3 integration, access control (~34 tests)
- [x] `ocr.service.spec.ts` — confidence threshold (>=80 auto, <80 manual), vendor auto-creation, Textract (~21 tests)

---

## Per-Module Coverage (After)

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| admin | 45.9% | 100% | 55.6% | 46.3% |
| approvals | 74.2% | 78.7% | 65.2% | 75.9% |
| audit | 59.6% | 100% | 75.0% | 63.0% |
| auth | 70.1% | 79.1% | 55.6% | 71.6% |
| budgets | 73.1% | 70.8% | 64.8% | 73.9% |
| categories | 64.9% | 100% | 60.0% | 66.7% |
| cost-centers | 37.0% | 100% | 50.0% | 37.5% |
| departments | 73.5% | 97.8% | 73.3% | 74.8% |
| expenses | 79.4% | 98.0% | 60.0% | 81.1% |
| notifications | 62.9% | 100% | 77.3% | 64.8% |
| ocr | 86.4% | 100% | 100% | 90.0% |
| pre-approvals | 54.5% | 100% | 53.3% | 56.7% |
| projects | 38.3% | 100% | 50.0% | 39.0% |
| receipts | 67.3% | 100% | 46.7% | 69.5% |
| reports | 71.7% | 71.4% | 74.5% | 70.8% |
| storage | 56.7% | 50.0% | 87.5% | 57.7% |
| users | 55.9% | 90.5% | 43.5% | 56.7% |
| vendors | 43.1% | 100% | 53.8% | 44.4% |
| vouchers | 75.1% | 83.8% | 60.6% | 76.4% |

> Note: These percentages include controllers, DTOs, and module files. Service-level coverage is significantly higher since tests target `.service.ts` files specifically.

## Issues Fixed During Implementation

1. **TypeScript errors (3):**
   - `projects.service.spec.ts` — missing required `startDate`/`endDate` in DTOs
   - `pre-approvals.service.spec.ts` — null assertion needed for `result!.status`
   - `admin.service.spec.ts` — referenced non-existent `escalationDays` property

2. **Double-assertion anti-pattern (13 tests):**
   - Calling `rejects.toThrow()` twice consumed mock chain on first call
   - Fixed with `try/catch` + `fail()` pattern in categories (6) and departments (7)

## Next Steps (to reach 80%+ per module)

- [ ] Add controller-level tests for modules with low coverage
- [ ] Add integration tests for complex workflows (expense submission, approval chain)
- [ ] Add edge case tests for modules below 60% coverage (cost-centers, projects, vendors, admin)
- [ ] Add E2E tests for critical API flows
