# Employee Dashboard Widget Visibility

## Task ID: employee-dashboard-widget-visibility
## Created: 2026-02-05
## Status: In Progress

---

## Objective
Implement role-based widget visibility on the dashboard to provide employees with a cleaner, focused experience while giving SUPER_APPROVER full access to all widgets including Finance Quick Stats.

---

## Pre-requisites Completed
- [x] Backend API access fix for EMPLOYEE role (commit 34563ca)
- [x] User-based data filtering in service layer (submitterId for EMPLOYEE)

---

## Tasks

### 1. Pre-flight Check ✅ COMPLETED
- [x] Restart API server to ensure latest code is running
- [x] Verify API endpoints respond correctly for EMPLOYEE role

### 2. Frontend Implementation ✅ COMPLETED
**File**: `packages/web/src/pages/dashboard/DashboardPage.tsx`

Changes:
- [x] Add `isSuperApprover` to `showFinanceStats` condition
- [x] Add `showFullDashboard = !isEmployee` flag
- [x] Conditionally hide Pending Approvals stat card for EMPLOYEE
- [x] Conditionally hide Outstanding Vouchers stat card for EMPLOYEE
- [x] Conditionally hide Budget Overview widget for EMPLOYEE
- [x] Update grid classes for responsive 2-column layout for EMPLOYEE
- [x] Update header subtitle text for EMPLOYEE
- [x] Extract nested ternary to helper function (getPendingApprovalsSubtitle)
- [x] Build passes successfully

### 3. QA Testing 🔄 IN PROGRESS
Test each role:
- [ ] EMPLOYEE: Simplified dashboard (2 stats, no Budget Overview, no errors)
- [ ] APPROVER: Full dashboard, department-scoped data
- [ ] SUPER_APPROVER: Full dashboard + Finance Quick Stats
- [ ] FINANCE: Full dashboard + Finance Quick Stats
- [ ] CEO: Full dashboard + Finance Quick Stats
- [ ] ADMIN: Full dashboard + Finance Quick Stats, no approvals table

### 4. Code Review
- [ ] No breaking changes
- [ ] Proper TypeScript types
- [ ] Accessibility maintained
- [ ] Mobile responsive

---

## Widget Visibility Matrix

| Widget | EMPLOYEE | APPROVER | SUPER_APPROVER | FINANCE | CEO | ADMIN |
|--------|----------|----------|----------------|---------|-----|-------|
| Total Expenses | Yes | Yes | Yes | Yes | Yes | Yes |
| Approved This Month | Yes | Yes | Yes | Yes | Yes | Yes |
| Pending Approvals stat | No | Yes | Yes | Yes | Yes | Yes |
| Outstanding Vouchers | No | Yes | Yes | Yes | Yes | Yes |
| Spending Trend | Yes | Yes | Yes | Yes | Yes | Yes |
| Budget Overview | No | Yes | Yes | Yes | Yes | Yes |
| Category Breakdown | Yes | Yes | Yes | Yes | Yes | Yes |
| Recent Expenses | Yes | Yes | Yes | Yes | Yes | Yes |
| Finance Quick Stats | No | No | Yes | Yes | Yes | Yes |
| Pending Approvals table | No | Yes | Yes | Yes | Yes | No |

---

## Test Credentials
- EMPLOYEE: `employee@tekcellent.com` / `Employee@123`
- APPROVER: `approver@tekcellent.com` / `Approver@123`
- SUPER_APPROVER: (check seed data)
- FINANCE: `finance@tekcellent.com` / `Finance@123`
- CEO: `ceo@tekcellent.com` / `Ceo@123`
- ADMIN: `admin@tekcellent.com` / `Admin@123`

---

## Verification Checklist
1. [ ] All employees see simplified dashboard
2. [ ] No "Failed to load" errors for any role
3. [ ] SUPER_APPROVER sees Finance Quick Stats
4. [ ] Mobile layout works correctly
5. [x] Build completes without errors
