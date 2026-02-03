# Epic: Role-Based Access Control (RBAC) Overhaul

**Created:** 2026-02-03
**Status:** Planning
**Priority:** P0 (Security/Compliance)
**Branch:** `feat/rbac-overhaul`

---

## Executive Summary

Implement industry best practices for role-based access control:

1. **SUPER_APPROVER Role** - Emergency approval capability with full audit trail
2. **ADMIN Separation of Duties** - Remove ADMIN from approval workflows
3. **Department-Scoped Access** - Managers (APPROVER) see only their department's data
4. **Enhanced Audit Logging** - Track all permission-sensitive operations

---

## Current State Analysis

### Existing Roles

| Role | Current Capabilities | Issues |
|------|---------------------|--------|
| EMPLOYEE | Submit expenses, view own | Correct |
| APPROVER | Approve any expense (tier-based) | Sees org-wide data |
| FINANCE | All approvals + budgets | Correct |
| ADMIN | Everything including approvals | Violates separation of duties |

### Key Problems

1. **ADMIN can approve expenses** - Creates audit/compliance risk
2. **APPROVER sees org-wide data** - Should only see department
3. **No emergency approval path** - If approvers unavailable, no escalation
4. **Insufficient audit trail** - Emergency actions not specially flagged

---

## Target State: Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐                                                   │
│  │  ADMIN   │  System config, user mgmt, audit logs             │
│  │          │  NO approval rights (separation of duties)        │
│  └──────────┘                                                   │
│                                                                 │
│  ┌──────────┐                                                   │
│  │   CEO    │  Highest approval tier (no limit)                 │
│  │          │  Org-wide visibility, final authority             │
│  │          │  Includes emergency approval capability           │
│  └──────────┘                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                   │
│  │ FINANCE  │  High-value approvals, budgets, payments          │
│  │          │  Org-wide visibility                              │
│  └──────────┘                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────┐                                             │
│  │ SUPER_APPROVER │  Emergency approvals (bypass tiers)         │
│  │                │  Requires justification + audit flag        │
│  │                │  Org-wide visibility for approvals          │
│  └────────────────┘                                             │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                   │
│  │ APPROVER │  Department approvals (tier-based)                │
│  │          │  Department-scoped visibility only                │
│  └──────────┘                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                   │
│  │ EMPLOYEE │  Submit expenses, view own                        │
│  │          │  No approval rights                               │
│  └──────────┘                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Small Company Considerations

### Should SUPER_APPROVER be the CEO?

**Short answer:** No - they serve different purposes, but the **same person** can hold both roles.

| Role | Purpose | When Used |
|------|---------|-----------|
| **CEO** | Regular workflow - highest approval tier | Normal high-value expenses (e.g., >500K PKR) |
| **SUPER_APPROVER** | Exception handling - bypass tiers | Emergencies when normal approvers unavailable |

### Recommended Configurations by Company Size

#### Small Company (< 50 employees)
```
CEO (1 person)        → Has CEO role (highest tier approvals)
                      → Also functions as emergency approver
CFO/Finance Lead      → FINANCE role
Department Heads (2-3)→ APPROVER role (department-scoped)
IT Administrator      → ADMIN role (no approvals)
```
**Note:** CEO inherently has emergency capability - no separate SUPER_APPROVER needed.

#### Medium Company (50-200 employees)
```
CEO                   → CEO role only
CFO                   → FINANCE role
VP/Directors (2-3)    → SUPER_APPROVER (cross-department emergency)
Department Managers   → APPROVER role (department-scoped)
IT Team               → ADMIN role
```

#### Large Company (200+ employees)
```
CEO                   → CEO role
CFO + Finance Team    → FINANCE role
Regional Directors    → SUPER_APPROVER (emergency coverage)
Department Managers   → APPROVER role
IT/Ops Team           → ADMIN role
```

### Implementation Decision

For this system, we'll make **CEO role include emergency approval capability** by default, eliminating the need for a small company to assign separate SUPER_APPROVER roles.

```typescript
// CEO can always emergency approve without separate flag
const canEmergencyApprove =
  user.role === 'CEO' ||           // Always
  user.role === 'SUPER_APPROVER' || // Dedicated emergency role
  user.role === 'FINANCE';          // Financial authority
```

---

## Permission Matrix (Target State)

| Feature | EMPLOYEE | APPROVER | SUPER_APPROVER | FINANCE | CEO | ADMIN |
|---------|:--------:|:--------:|:--------------:|:-------:|:---:|:-----:|
| **Expenses** |
| Create expense | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own expenses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View department expenses | - | ✓ | ✓ | ✓ | ✓ | - |
| View all expenses | - | - | ✓ | ✓ | ✓ | - |
| **Approvals** |
| Approve (tier-based) | - | ✓ (dept) | ✓ (all) | ✓ | ✓ | - |
| Approve highest tier | - | - | - | - | ✓ | - |
| Emergency approve | - | - | ✓ | ✓ | ✓ | - |
| Reject expenses | - | ✓ (dept) | ✓ (all) | ✓ | ✓ | - |
| Request clarification | - | ✓ (dept) | ✓ (all) | ✓ | ✓ | - |
| **Budgets** |
| Create budgets | - | - | - | ✓ | ✓ | ✓ |
| View department budgets | - | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all budgets | - | - | ✓ | ✓ | ✓ | ✓ |
| Transfer funds | - | - | - | ✓ | ✓ | ✓ |
| **Reports** |
| Department reports | - | ✓ | ✓ | ✓ | ✓ | - |
| Org-wide reports | - | - | ✓ | ✓ | ✓ | ✓ |
| **Administration** |
| User management | - | - | - | - | - | ✓ |
| Category management | - | - | - | - | - | ✓ |
| Approval tier config | - | - | - | - | ✓ | ✓ |
| System settings | - | - | - | - | - | ✓ |
| Audit logs | - | - | - | ✓ | ✓ | ✓ |

### Approval Tier Routing (Example)

| Amount Range (PKR) | Required Role | Fallback |
|-------------------|---------------|----------|
| 0 - 50,000 | APPROVER | SUPER_APPROVER, FINANCE, CEO |
| 50,001 - 200,000 | FINANCE | CEO |
| 200,001 - 500,000 | FINANCE | CEO |
| 500,001+ | CEO | None (must be CEO) |

---

## Implementation Stories

### Story 1: Add CEO and SUPER_APPROVER Roles

**Priority:** P0
**Effort:** Small

#### Tasks

##### 1.1 Update Prisma Schema
**File:** `packages/api/prisma/schema.prisma`

```prisma
enum RoleType {
  EMPLOYEE
  APPROVER
  SUPER_APPROVER    // NEW: Emergency approvals (cross-department)
  FINANCE
  CEO               // NEW: Highest approval authority
  ADMIN
}
```

**Role Order Rationale:**
- Enum order reflects general hierarchy for UI dropdowns
- CEO above FINANCE for approval authority
- ADMIN separate (system admin, not approval authority)

##### 1.2 Create Migration
```bash
npx prisma migrate dev --name add_ceo_and_super_approver_roles --schema packages/api/prisma/schema.prisma
```

##### 1.3 Update Frontend Types
**File:** `packages/web/src/features/auth/types/auth.types.ts`

```typescript
export type RoleType = 'EMPLOYEE' | 'APPROVER' | 'SUPER_APPROVER' | 'FINANCE' | 'CEO' | 'ADMIN';
```

##### 1.4 Update Seed Data
**File:** `packages/api/prisma/seed.ts`

Add test users:
```typescript
// CEO user
{
  email: 'ceo@tekcellent.com',
  firstName: 'Chief',
  lastName: 'Executive',
  role: 'CEO',
  departmentId: null,  // Org-wide
}

// Super Approver (for medium/large company testing)
{
  email: 'director@tekcellent.com',
  firstName: 'Regional',
  lastName: 'Director',
  role: 'SUPER_APPROVER',
  departmentId: null,  // Cross-department
}
```

##### 1.5 Add Highest Approval Tier for CEO
**File:** `packages/api/prisma/seed.ts`

```typescript
// Add CEO tier (no upper limit)
{
  name: 'Executive (500,001+ PKR)',
  tierOrder: 4,
  minAmount: 500001,
  maxAmount: null,  // No limit
  approverRole: 'CEO',
  isActive: true,
}
```

#### Verification
- [ ] Migration runs without errors
- [ ] CEO and SUPER_APPROVER appear in User creation form
- [ ] CEO tier appears in approval tier list
- [ ] Existing users unaffected

---

### Story 2: Remove ADMIN from Approval Workflows

**Priority:** P0
**Effort:** Small

#### Tasks

##### 2.1 Update Approvals Controller
**File:** `packages/api/src/modules/approvals/approvals.controller.ts`

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /pending` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `GET /history` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `POST /approve` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `POST /approve/bulk` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `POST /reject` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `POST /clarify` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `GET /delegations` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `POST /delegations` | APPROVER, FINANCE, ADMIN | APPROVER, SUPER_APPROVER, FINANCE, CEO |
| `GET /tiers` | ADMIN, FINANCE | ADMIN, FINANCE, CEO |

**Code Change:**
```typescript
// Before
@Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)

// After
@Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
```

##### 2.2 Update Frontend Navigation
**File:** `packages/web/src/App.tsx`

Remove Approvals link from sidebar for ADMIN role (if present).

#### Verification
- [ ] ADMIN cannot access `/approvals` endpoints (403)
- [ ] ADMIN cannot see Approvals in navigation
- [ ] SUPER_APPROVER can access all approval endpoints
- [ ] FINANCE unchanged

---

### Story 3: Department-Scoped Access for APPROVER

**Priority:** P1
**Effort:** Medium

#### Tasks

##### 3.1 Update Expenses Service
**File:** `packages/api/src/modules/expenses/expenses.service.ts`

```typescript
private buildExpenseWhereClause(
  user: User,
  filters: ExpenseFiltersDto,
): Prisma.ExpenseWhereInput {
  const isOrgWide = user.role === RoleType.FINANCE;
  const isDepartmentScoped = user.role === RoleType.APPROVER ||
                             user.role === RoleType.SUPER_APPROVER;

  let where: Prisma.ExpenseWhereInput = {};

  if (isOrgWide) {
    // FINANCE sees all expenses
    where = {};
  } else if (isDepartmentScoped && user.departmentId) {
    // APPROVER/SUPER_APPROVER sees department expenses
    where = {
      OR: [
        { submitterId: user.id },  // Own expenses
        { submitter: { departmentId: user.departmentId } },  // Department expenses
      ],
    };
  } else {
    // EMPLOYEE sees only own expenses
    where = { submitterId: user.id };
  }

  // Apply additional filters...
  return where;
}
```

##### 3.2 Update Budgets Service
**File:** `packages/api/src/modules/budgets/budgets.service.ts`

```typescript
async findAll(
  user: User,  // NEW: Add user parameter
  type?: BudgetType,
  activeOnly: boolean = true,
) {
  const isOrgWide = user.role === RoleType.FINANCE || user.role === RoleType.ADMIN;

  const where: Prisma.BudgetWhereInput = {
    ...(activeOnly && { isActive: true }),
    ...(type && { type }),
    // Department filter for non-org-wide roles
    ...(!isOrgWide && user.departmentId && { departmentId: user.departmentId }),
  };

  return this.prisma.budget.findMany({ where });
}
```

##### 3.3 Update Reports Service
**File:** `packages/api/src/modules/reports/reports.service.ts`

Add `departmentId?: string` parameter to all report methods:

```typescript
async getDashboardSummary(
  days: number = 30,
  departmentId?: string,  // NEW
) {
  const dateFilter = /* ... */;

  const where: Prisma.ExpenseWhereInput = {
    ...dateFilter,
    ...(departmentId && {
      submitter: { departmentId }
    }),
  };

  // Rest of implementation...
}

async getMonthlyTrend(year: number, departmentId?: string) { /* ... */ }
async getSpendByCategory(filters: SpendByCategoryDto & { departmentId?: string }) { /* ... */ }
async getSpendByDepartment(startDate?: string, endDate?: string, departmentId?: string) { /* ... */ }
```

##### 3.4 Update Controllers to Pass Department Context
**File:** `packages/api/src/modules/reports/reports.controller.ts`

```typescript
@Get('dashboard-summary')
getDashboardSummary(
  @CurrentUser() user: User,
  @Query('days') days?: number,
  @Query('departmentId') departmentId?: string,
) {
  // For APPROVER, force department filter
  const effectiveDeptId =
    user.role === RoleType.APPROVER ? user.departmentId : departmentId;

  return this.reportsService.getDashboardSummary(days, effectiveDeptId);
}
```

##### 3.5 Update Frontend Dashboard
**File:** `packages/web/src/pages/dashboard/DashboardPage.tsx`

```typescript
import { useAppSelector } from '@/store/hooks';

export function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  // Determine scope based on role
  const isOrgWide = user?.role === 'FINANCE' || user?.role === 'ADMIN';
  const departmentId = isOrgWide ? undefined : user?.departmentId;

  const { data: summary } = useGetDashboardSummaryQuery({
    days: 30,
    departmentId,
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="text-gray-600">
        {isOrgWide
          ? "Organization-wide metrics"
          : `Showing metrics for ${user?.departmentName || 'your department'}`}
      </p>
      {/* ... */}
    </div>
  );
}
```

#### Verification
- [ ] APPROVER sees only department expenses in list
- [ ] APPROVER dashboard shows department metrics only
- [ ] APPROVER budget list shows department budgets only
- [ ] FINANCE sees all data (unchanged)
- [ ] SUPER_APPROVER sees all data for approvals
- [ ] API returns 200 with filtered data (not 403)

---

### Story 4: SUPER_APPROVER Emergency Approval Flow

**Priority:** P1
**Effort:** Medium

#### Tasks

##### 4.1 Add Emergency Approval Fields
**File:** `packages/api/prisma/schema.prisma`

```prisma
model ApprovalHistory {
  id                String   @id @default(uuid())
  expenseId         String
  expense           Expense  @relation(fields: [expenseId], references: [id])

  action            ApprovalAction
  comment           String?

  // NEW: Emergency approval tracking
  isEmergencyApproval  Boolean  @default(false)
  emergencyReason      String?

  actorId           String
  actor             User     @relation(fields: [actorId], references: [id])

  // ... existing fields
}
```

##### 4.2 Update Approve DTO
**File:** `packages/api/src/modules/approvals/dto/approve.dto.ts`

```typescript
export class ApproveDto {
  @IsUUID()
  expenseId: string;

  @IsOptional()
  @IsString()
  comment?: string;

  // NEW: Emergency approval fields
  @IsOptional()
  @IsBoolean()
  isEmergencyApproval?: boolean;

  @ValidateIf((o) => o.isEmergencyApproval === true)
  @IsString()
  @MinLength(20, { message: 'Emergency reason must be at least 20 characters' })
  emergencyReason?: string;
}
```

##### 4.3 Update Approvals Service
**File:** `packages/api/src/modules/approvals/approvals.service.ts`

```typescript
async approve(user: User, approveDto: ApproveDto) {
  const { expenseId, comment, isEmergencyApproval, emergencyReason } = approveDto;

  // Roles that can perform emergency approvals
  const emergencyRoles = [RoleType.CEO, RoleType.SUPER_APPROVER, RoleType.FINANCE];

  // Validate emergency approval requirements
  if (isEmergencyApproval) {
    if (!emergencyRoles.includes(user.role)) {
      throw new ForbiddenException('Only CEO, SUPER_APPROVER, or FINANCE can perform emergency approvals');
    }
    // CEO doesn't need to provide reason (implicit authority)
    if (user.role !== RoleType.CEO && (!emergencyReason || emergencyReason.length < 20)) {
      throw new BadRequestException('Emergency approval requires detailed justification');
    }
  }

  // Check authority (skip tier check for emergency)
  if (!isEmergencyApproval) {
    const authority = await this.checkApprovalAuthority(user, expense);
    if (!authority.isAuthorized) {
      throw new ForbiddenException(authority.reason);
    }
  }

  // Create approval history with emergency flag
  await this.prisma.approvalHistory.create({
    data: {
      expenseId,
      action: ApprovalAction.APPROVED,
      comment,
      isEmergencyApproval: isEmergencyApproval || false,
      emergencyReason: emergencyReason || null,
      actorId: user.id,
    },
  });

  // Log to audit trail with special flag
  await this.auditService.log({
    userId: user.id,
    action: isEmergencyApproval ? 'EMERGENCY_APPROVE' : 'APPROVE',
    entityType: 'Expense',
    entityId: expenseId,
    newValue: { isEmergencyApproval, emergencyReason },
  });

  // ... rest of approval logic
}
```

##### 4.4 Add Emergency Approval Report
**File:** `packages/api/src/modules/reports/reports.service.ts`

```typescript
async getEmergencyApprovals(startDate?: string, endDate?: string) {
  return this.prisma.approvalHistory.findMany({
    where: {
      isEmergencyApproval: true,
      createdAt: this.getDateFilter(startDate, endDate),
    },
    include: {
      expense: true,
      actor: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

##### 4.5 Frontend Emergency Approval UI
**File:** `packages/web/src/features/approvals/components/ApproveModal.tsx`

```typescript
export function ApproveModal({ expense, onApprove, onClose }) {
  const { user } = useAppSelector((state) => state.auth);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');

  const canEmergencyApprove = user?.role === 'SUPER_APPROVER' || user?.role === 'FINANCE';

  const handleApprove = () => {
    onApprove({
      expenseId: expense.id,
      comment,
      isEmergencyApproval: isEmergency,
      emergencyReason: isEmergency ? emergencyReason : undefined,
    });
  };

  return (
    <Modal>
      {/* Regular approval fields */}

      {canEmergencyApprove && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            <span className="font-medium text-amber-800">
              Emergency Approval (bypass tier requirements)
            </span>
          </label>

          {isEmergency && (
            <textarea
              className="mt-2 w-full border rounded p-2"
              placeholder="Explain why this requires emergency approval (min 20 chars)..."
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              minLength={20}
              required
            />
          )}
        </div>
      )}

      <Button onClick={handleApprove}>
        {isEmergency ? 'Emergency Approve' : 'Approve'}
      </Button>
    </Modal>
  );
}
```

#### Verification
- [ ] SUPER_APPROVER can approve any expense with emergency flag
- [ ] Emergency approval requires reason (min 20 chars)
- [ ] Emergency approvals logged with special action type
- [ ] Emergency approval report shows all emergency approvals
- [ ] ADMIN cannot use emergency approval (no approval rights)

---

### Story 5: Enhanced Audit Logging

**Priority:** P1
**Effort:** Small

#### Tasks

##### 5.1 Update AuditLogData Interface
**File:** `packages/api/src/modules/audit/audit.service.ts`

```typescript
export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;

  // NEW: Additional context
  departmentId?: string;
  isEmergencyAction?: boolean;
  reason?: string;
}
```

##### 5.2 Add Audit Actions Enum
**File:** `packages/api/src/modules/audit/audit.types.ts`

```typescript
export enum AuditAction {
  // Auth
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Expenses
  EXPENSE_CREATE = 'EXPENSE_CREATE',
  EXPENSE_UPDATE = 'EXPENSE_UPDATE',
  EXPENSE_SUBMIT = 'EXPENSE_SUBMIT',
  EXPENSE_DELETE = 'EXPENSE_DELETE',

  // Approvals
  APPROVE = 'APPROVE',
  EMERGENCY_APPROVE = 'EMERGENCY_APPROVE',  // NEW
  REJECT = 'REJECT',
  CLARIFICATION_REQUEST = 'CLARIFICATION_REQUEST',

  // Budgets
  BUDGET_CREATE = 'BUDGET_CREATE',
  BUDGET_UPDATE = 'BUDGET_UPDATE',
  BUDGET_TRANSFER = 'BUDGET_TRANSFER',

  // Admin
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',  // NEW
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
}
```

##### 5.3 Log Role Changes
**File:** `packages/api/src/modules/users/users.service.ts`

```typescript
async update(id: string, updateUserDto: UpdateUserDto, actorId: string) {
  const existingUser = await this.prisma.user.findUnique({ where: { id } });

  const updatedUser = await this.prisma.user.update({
    where: { id },
    data: updateUserDto,
  });

  // Log role change specifically
  if (updateUserDto.role && updateUserDto.role !== existingUser.role) {
    await this.auditService.log({
      userId: actorId,
      action: AuditAction.USER_ROLE_CHANGE,
      entityType: 'User',
      entityId: id,
      oldValue: { role: existingUser.role },
      newValue: { role: updateUserDto.role },
    });
  }

  return updatedUser;
}
```

#### Verification
- [ ] All approval actions logged with context
- [ ] Emergency approvals have distinct action type
- [ ] Role changes tracked separately
- [ ] Audit log report shows filterable action types

---

### Story 6: Frontend Role-Based UI

**Priority:** P2
**Effort:** Small

#### Tasks

##### 6.1 Create useRolePermissions Hook
**File:** `packages/web/src/hooks/useRolePermissions.ts`

```typescript
import { useAppSelector } from '@/store/hooks';
import type { RoleType } from '@/features/auth/types/auth.types';

interface RolePermissions {
  // Data visibility
  canViewOrgWideData: boolean;
  canViewDepartmentData: boolean;

  // Approvals
  canApprove: boolean;
  canEmergencyApprove: boolean;

  // Budgets
  canCreateBudgets: boolean;
  canTransferBudgets: boolean;

  // Admin
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAuditLogs: boolean;

  // Context
  departmentId?: string;
  departmentName?: string;
  scopeLabel: string;
}

export function useRolePermissions(): RolePermissions {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role as RoleType;

  // Role groupings
  const isCEO = role === 'CEO';
  const isFinance = role === 'FINANCE';
  const isSuperApprover = role === 'SUPER_APPROVER';
  const isApprover = role === 'APPROVER';
  const isAdmin = role === 'ADMIN';

  // Visibility scopes
  const isOrgWide = isCEO || isFinance || isSuperApprover || isAdmin;
  const isDepartmentScoped = isApprover;

  return {
    // Data visibility
    canViewOrgWideData: isOrgWide,
    canViewDepartmentData: isDepartmentScoped || isOrgWide,

    // Approvals (ADMIN excluded - separation of duties)
    canApprove: isApprover || isSuperApprover || isFinance || isCEO,
    canApproveHighestTier: isCEO,  // Only CEO for 500K+ PKR
    canEmergencyApprove: isCEO || isSuperApprover || isFinance,

    // Budgets
    canCreateBudgets: isFinance || isCEO || isAdmin,
    canTransferBudgets: isFinance || isCEO || isAdmin,
    canConfigureApprovalTiers: isCEO || isAdmin,

    // Admin
    canManageUsers: isAdmin,
    canManageSettings: isAdmin,
    canViewAuditLogs: isAdmin || isFinance || isCEO,

    // Context
    departmentId: user?.departmentId,
    departmentName: user?.departmentName,
    scopeLabel: isOrgWide
      ? 'Organization'
      : (user?.departmentName || 'Your Department'),

    // Role info
    isCEO,
    isFinance,
    isSuperApprover,
    isApprover,
    isAdmin,
  };
}
```

##### 6.2 Update Navigation
**File:** `packages/web/src/components/layout/Sidebar.tsx`

```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

export function Sidebar() {
  const { canApprove, canManageUsers, canManageSettings, canViewAuditLogs } = useRolePermissions();

  return (
    <nav>
      <NavLink to="/">Dashboard</NavLink>
      <NavLink to="/expenses">Expenses</NavLink>

      {canApprove && <NavLink to="/approvals">Approvals</NavLink>}

      <NavLink to="/budgets">Budgets</NavLink>
      <NavLink to="/reports">Reports</NavLink>

      {(canManageUsers || canManageSettings) && (
        <NavGroup label="Admin">
          {canManageUsers && <NavLink to="/admin/users">Users</NavLink>}
          {canManageSettings && <NavLink to="/admin/settings">Settings</NavLink>}
          {canViewAuditLogs && <NavLink to="/admin/audit-logs">Audit Logs</NavLink>}
        </NavGroup>
      )}
    </nav>
  );
}
```

##### 6.3 Update Dashboard Scope Indicator
**File:** `packages/web/src/pages/dashboard/DashboardPage.tsx`

```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

export function DashboardPage() {
  const { canViewOrgWideData, scopeLabel, departmentId } = useRolePermissions();

  const { data: summary } = useGetDashboardSummaryQuery({
    days: 30,
    departmentId: canViewOrgWideData ? undefined : departmentId,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Dashboard</h1>
        <Badge variant={canViewOrgWideData ? 'primary' : 'default'}>
          {scopeLabel}
        </Badge>
      </div>
      {/* ... */}
    </div>
  );
}
```

#### Verification
- [ ] ADMIN sees no "Approvals" in navigation
- [ ] APPROVER sees department scope indicator
- [ ] SUPER_APPROVER sees emergency approval option
- [ ] Role permissions hook correctly calculates all flags

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| **Backend - Schema** |
| `packages/api/prisma/schema.prisma` | Add CEO + SUPER_APPROVER enums, emergency fields |
| `packages/api/prisma/seed.ts` | Add CEO user, CEO tier, SUPER_APPROVER user |
| **Backend - Services** |
| `packages/api/src/modules/approvals/approvals.service.ts` | Emergency approval logic, CEO tier handling |
| `packages/api/src/modules/approvals/approvals.controller.ts` | Remove ADMIN, add CEO + SUPER_APPROVER |
| `packages/api/src/modules/expenses/expenses.service.ts` | Department filtering for APPROVER |
| `packages/api/src/modules/budgets/budgets.service.ts` | Department filtering, CEO access |
| `packages/api/src/modules/budgets/budgets.controller.ts` | Add CEO to role decorators |
| `packages/api/src/modules/reports/reports.service.ts` | Department parameter for all methods |
| `packages/api/src/modules/reports/reports.controller.ts` | Pass department context, add CEO role |
| `packages/api/src/modules/audit/audit.service.ts` | Enhanced logging with department context |
| **Backend - DTOs** |
| `packages/api/src/modules/approvals/dto/approve.dto.ts` | Emergency approval fields |
| **Frontend - Types** |
| `packages/web/src/features/auth/types/auth.types.ts` | Add CEO + SUPER_APPROVER to RoleType |
| **Frontend - Hooks** |
| `packages/web/src/hooks/useRolePermissions.ts` | **NEW**: Centralized permission calculations |
| **Frontend - Components** |
| `packages/web/src/components/layout/Sidebar.tsx` | Role-based navigation (hide Approvals from ADMIN) |
| `packages/web/src/pages/dashboard/DashboardPage.tsx` | Department scoping, scope indicator |
| `packages/web/src/features/approvals/components/ApproveModal.tsx` | Emergency approval UI |
| `packages/web/src/pages/budgets/BudgetListPage.tsx` | Department filtering for APPROVER |
| `packages/web/src/pages/reports/*.tsx` | Department filtering for APPROVER |

---

## Migration Strategy

### Phase 1: Add Role (Non-Breaking)
1. Add SUPER_APPROVER to enum
2. Run migration
3. No existing functionality affected

### Phase 2: Update Permissions (Breaking for ADMIN)
1. Remove ADMIN from approval endpoints
2. Add SUPER_APPROVER to approval endpoints
3. Communicate to ADMIN users

### Phase 3: Add Department Scoping
1. Update services with department filtering
2. Update frontend to pass department context
3. Verify APPROVER sees only department data

### Phase 4: Emergency Approval
1. Add emergency approval fields
2. Implement emergency flow
3. Add emergency approval report

---

## Verification Checklist

### Backend
- [ ] SUPER_APPROVER enum value exists in Prisma
- [ ] Migration runs successfully
- [ ] ADMIN cannot access approval endpoints (403)
- [ ] APPROVER sees only department expenses
- [ ] SUPER_APPROVER can emergency approve
- [ ] Emergency approvals require reason
- [ ] Audit logs capture all actions

### Frontend
- [ ] SUPER_APPROVER type recognized
- [ ] ADMIN sees no Approvals nav item
- [ ] APPROVER sees department scope indicator
- [ ] Emergency approval checkbox visible for SUPER_APPROVER
- [ ] Dashboard shows appropriate scope label

### E2E
- [ ] Employee submits expense
- [ ] APPROVER sees only department pending
- [ ] SUPER_APPROVER can emergency approve
- [ ] FINANCE can approve all
- [ ] ADMIN cannot approve anything
- [ ] All actions appear in audit log

---

## Rollback Plan

If issues discovered:
1. Revert migration (remove SUPER_APPROVER enum)
2. Restore ADMIN to approval decorators
3. Remove department filtering from services

---

## Related Documents

- [Approval Workflow Skill](/.claude/skills/approval-workflow.md)
- [Testing Patterns](/.claude/skills/testing-patterns.md)
- [Current Plan File](/.claude/plans/staged-sniffing-pelican.md)
