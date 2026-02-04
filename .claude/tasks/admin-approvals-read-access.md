# Task: Add Admin Read-Only Access to Approvals Page

**Created**: 2026-02-04
**Status**: Pending

---

## Problem
Admin users can see and click the "Pending Approval" card on the dashboard, but the Approvals page shows "Failed to load pending approvals" because ADMIN role is not authorized to access approval endpoints.

## Root Cause
- ADMIN is intentionally excluded from approval actions for **separation of duties** (admin manages system, not approvals)
- Current implementation applies same role restriction to both **read** (GET pending) and **write** (POST approve/reject) endpoints
- No granularity between read-only access and write access

## Solution
Add ADMIN to **read-only** (GET) approval endpoints while keeping write endpoints restricted to approving roles only.

**Pattern already exists**: Reports module allows ADMIN read access; Budgets module has different roles for read vs write.

---

## Files to Modify

### 1. Backend: Add role constants
**File**: `packages/api/src/common/constants/roles.ts`

Add new constant for approval read roles:
```typescript
export const APPROVAL_READ_ROLES = [
  RoleType.APPROVER,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.CEO,
  RoleType.ADMIN,  // Admin can view but not act
];

export const APPROVAL_WRITE_ROLES = [
  RoleType.APPROVER,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.CEO,
];
```

### 2. Backend: Update approvals controller
**File**: `packages/api/src/modules/approvals/approvals.controller.ts`

Update GET endpoints to use `APPROVAL_READ_ROLES`:
- `GET /pending` - change to `@Roles(...APPROVAL_READ_ROLES)`
- `GET /history` - change to `@Roles(...APPROVAL_READ_ROLES)`
- `GET /delegations` - change to `@Roles(...APPROVAL_READ_ROLES)`

Keep POST endpoints with `APPROVAL_WRITE_ROLES`:
- `POST /approve` - keep restricted
- `POST /reject` - keep restricted
- `POST /clarify` - keep restricted
- `POST /delegations` - keep restricted

### 3. Frontend: Mirror role constants
**File**: `packages/web/src/constants/roles.ts`

Add matching constants:
```typescript
export const APPROVAL_READ_ROLES = ['APPROVER', 'SUPER_APPROVER', 'FINANCE', 'CEO', 'ADMIN'];
export const APPROVAL_WRITE_ROLES = ['APPROVER', 'SUPER_APPROVER', 'FINANCE', 'CEO'];
```

### 4. Frontend: Update ApprovalQueuePage
**File**: `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`

Hide approval action elements for ADMIN role:
- Import `useRolePermissions` from `@/hooks`
- Get `canApprove` boolean at component start
- Conditionally render based on `canApprove`:
  - **Checkbox column**: Hide header and row checkboxes
  - **Bulk actions bar**: Hide entirely (lines 275-297)
  - **Actions column header**: Hide or show as "Details"
  - **Row action buttons**: Hide Approve/Reject/Clarify buttons (lines 388-414)
- Keep rows clickable to navigate to expense details

### 5. Frontend: Verify useRolePermissions hook
**File**: `packages/web/src/hooks/useRolePermissions.ts`

Verify `canApprove` returns `false` for ADMIN (already confirmed - line 90 excludes ADMIN).

---

## Implementation Details

### Backend Controller Changes

```typescript
// GET endpoints - use APPROVAL_READ_ROLES
@Get('pending')
@Roles(...APPROVAL_READ_ROLES)
async getPendingApprovals(...) { ... }

@Get('history')
@Roles(...APPROVAL_READ_ROLES)
async getApprovalHistory(...) { ... }

// POST endpoints - keep APPROVAL_WRITE_ROLES (existing APPROVING_ROLES)
@Post('approve')
@Roles(...APPROVAL_WRITE_ROLES)
async approveExpense(...) { ... }
```

### Frontend UI Changes

```tsx
// In ApprovalQueuePage - hide action buttons for non-approvers
const { canApprove } = useRolePermissions();

// Hide checkbox column for non-approvers
{canApprove && (
  <th className="px-6 py-3 text-left">
    <input type="checkbox" ... />
  </th>
)}

// Hide bulk actions bar
{canApprove && selectedIds.length > 0 && (
  <div className="bg-primary-50 ...">
    ...
  </div>
)}

// Hide action buttons in each row
{canApprove && (
  <div className="flex justify-end space-x-2">
    <button>Approve</button>
    <button>Reject</button>
    <button>Clarify</button>
  </div>
)}
```

---

## Verification
1. Login as **Admin** user
2. Navigate to Dashboard → click "Pending Approval" card
3. Approvals page should load and display pending items (no error)
4. Approve/Reject buttons should be hidden for Admin
5. Click on expense row → should navigate to expense details
6. Login as **Approver** user → verify approve/reject still works
7. Login as **Finance** user → verify approve/reject still works

---

## Security Considerations
- Backend enforces write restrictions via `APPROVAL_WRITE_ROLES` - even if UI bug shows buttons, API will reject
- ADMIN read-only access maintains audit trail visibility without approval authority
- Separation of duties preserved: system admins cannot approve expenses

---

## Progress

- [ ] Commit and push existing dashboard/finance changes
- [ ] Add `APPROVAL_READ_ROLES` and `APPROVAL_WRITE_ROLES` to backend constants
- [ ] Update approvals controller GET endpoints
- [ ] Add constants to frontend
- [ ] Update ApprovalQueuePage UI
- [ ] Test with Admin, Approver, and Finance users
