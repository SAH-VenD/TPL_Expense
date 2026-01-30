# Skill: Approval Workflow

## Context
This skill contains the business rules and implementation patterns for the multi-tier approval system. Reference this when implementing approval-related functionality including expense approvals, voucher approvals, and pre-approval requests.

---

## Core Concepts

### Approval Flow

```
┌──────────────┐
│   SUBMIT     │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  REPORTING   │───►│ TIER-BASED   │ (if amount > manager limit)
│   MANAGER    │    │  APPROVERS   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ├───────────────────┤
       ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   APPROVE    │    │   REJECT     │    │  CLARIFY     │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Approval Entities

| Entity | Purpose |
|--------|---------|
| `ApprovalTier` | Defines approval levels and thresholds |
| `ApprovalHistory` | Records all approval actions (audit trail) |
| `ApprovalDelegation` | Temporary delegation of approval authority |

---

## Approval Tier Structure

### Default Tiers

```typescript
const DEFAULT_APPROVAL_TIERS = [
  {
    level: 1,
    name: 'Reporting Manager',
    minAmount: 0,
    maxAmount: 25000,         // PKR
    approverType: 'REPORTING_MANAGER',
    approverUserId: null,     // Dynamic based on submitter
  },
  {
    level: 2,
    name: 'Department Head',
    minAmount: 25001,
    maxAmount: 100000,
    approverType: 'ROLE',
    approverRole: 'department_head',
  },
  {
    level: 3,
    name: 'Finance Manager',
    minAmount: 100001,
    maxAmount: 250000,
    approverType: 'ROLE',
    approverRole: 'finance_manager',
  },
  {
    level: 4,
    name: 'CFO/CEO',
    minAmount: 250001,
    maxAmount: null,          // No upper limit
    approverType: 'ROLE',
    approverRole: 'executive',
  },
];
```

### Tier Data Model

```typescript
interface ApprovalTier {
  id: string;
  level: number;              // 1, 2, 3, 4 (order of approval)
  name: string;

  // Amount thresholds (in base currency PKR)
  minAmount: number;
  maxAmount: number | null;   // null = no upper limit

  // Who approves
  approverType: 'REPORTING_MANAGER' | 'USER' | 'ROLE';
  approverUserId?: string;    // If type is USER
  approverRole?: string;      // If type is ROLE

  // Configuration
  isActive: boolean;
  autoApproveBelow?: number;  // Optional: auto-approve under this amount

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Approval Flow Logic

### Determining Required Approvers

```typescript
async function getRequiredApprovers(
  expense: Expense,
  submitter: User
): Promise<ApprovalChain> {
  const chain: ApprovalChain = {
    tiers: [],
    currentTierIndex: 0,
  };

  // Get all applicable tiers for this amount
  const tiers = await this.prisma.approvalTier.findMany({
    where: {
      isActive: true,
      minAmount: { lte: expense.pkrAmount },
    },
    orderBy: { level: 'asc' },
  });

  for (const tier of tiers) {
    // Skip if amount exceeds this tier's max
    if (tier.maxAmount && expense.pkrAmount > tier.maxAmount) {
      continue;
    }

    const approver = await this.resolveApprover(tier, submitter, expense);

    chain.tiers.push({
      tier,
      approver,
      status: 'PENDING',
      approvedAt: null,
    });
  }

  return chain;
}

async function resolveApprover(
  tier: ApprovalTier,
  submitter: User,
  expense: Expense
): Promise<User> {
  switch (tier.approverType) {
    case 'REPORTING_MANAGER':
      // Get submitter's reporting manager
      return this.prisma.user.findUnique({ where: { id: submitter.reportingManagerId } });

    case 'USER':
      // Specific user assigned
      return this.prisma.user.findUnique({ where: { id: tier.approverUserId } });

    case 'ROLE':
      // Find user with this role (in submitter's department or global)
      return this.prisma.user.findFirst({
        where: {
          OR: [
            { role: tier.approverRole, departmentId: submitter.departmentId },
            { role: tier.approverRole, isGlobalApprover: true },
          ],
        },
      });

    default:
      throw new Error(`Unknown approver type: ${tier.approverType}`);
  }
}
```

### Processing Approval Actions

```typescript
async function processApproval(
  expenseId: string,
  approverId: string,
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION',
  comments?: string
): Promise<Expense> {
  const expense = await this.prisma.expense.findUnique({
    where: { id: expenseId },
    include: { approvalChain: true, user: true },
  });

  // Validate approver has authority
  const currentTier = this.getCurrentApprovalTier(expense);
  const isAuthorized = await this.isAuthorizedApprover(approverId, currentTier, expense);

  if (!isAuthorized) {
    throw new ForbiddenException('You are not authorized to approve this expense');
  }

  // Record the action
  await this.prisma.approvalHistory.create({
    data: {
      entityType: 'EXPENSE',
      entityId: expenseId,
      tierId: currentTier.id,
      approverId,
      action,
      comments,
      delegatedFromId: await this.checkDelegation(approverId, currentTier),
    },
  });

  // Process based on action
  switch (action) {
    case 'APPROVE':
      return this.handleApprove(expense, currentTier);

    case 'REJECT':
      return this.handleReject(expense, comments);

    case 'REQUEST_CLARIFICATION':
      return this.handleClarification(expense, comments);
  }
}

async function handleApprove(expense: Expense, currentTier: ApprovalTier): Promise<Expense> {
  // Mark current tier as approved
  currentTier.status = 'APPROVED';
  currentTier.approvedAt = new Date();

  // Check if there are more tiers
  const nextTier = this.getNextApprovalTier(expense);

  if (nextTier) {
    // Move to next tier
    expense.approvalChain.currentTierIndex++;
    await this.notifyNextApprover(expense, nextTier);
  } else {
    // All tiers approved - mark expense as approved
    expense.status = ExpenseStatus.APPROVED;
    expense.approvedAt = new Date();
    await this.notifySubmitter(expense, 'APPROVED');
  }

  return this.prisma.expense.update({
    where: { id: expense.id },
    data: expense,
  });
}

async function handleReject(expense: Expense, reason: string): Promise<Expense> {
  if (!reason) {
    throw new BadRequestException('Rejection reason is required');
  }

  await this.notifySubmitter(expense, 'REJECTED', reason);

  return this.prisma.expense.update({
    where: { id: expense.id },
    data: {
      status: ExpenseStatus.REJECTED,
      rejectedAt: new Date(),
    },
  });
}

async function handleClarification(expense: Expense, question: string): Promise<Expense> {
  if (!question) {
    throw new BadRequestException('Clarification question is required');
  }

  await this.notifySubmitter(expense, 'CLARIFICATION_REQUESTED', question);

  return this.prisma.expense.update({
    where: { id: expense.id },
    data: { status: ExpenseStatus.CLARIFICATION_REQUESTED },
  });
}
```

---

## Approval Delegation

### Delegation Model

```typescript
interface ApprovalDelegation {
  id: string;

  // Who is delegating
  delegatorId: string;

  // Who receives the authority
  delegateId: string;

  // Time period
  startDate: Date;
  endDate: Date;

  // Scope (optional restrictions)
  departmentIds?: string[];     // Only for specific departments
  maxAmount?: number;           // Only up to this amount
  tierIds?: string[];           // Only for specific tiers

  // Status
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  revokedAt?: Date;
  revokedReason?: string;

  createdAt: Date;
}
```

### Delegation Logic

```typescript
async function createDelegation(
  delegatorId: string,
  dto: CreateDelegationDto
): Promise<ApprovalDelegation> {
  // Validate delegator has approval authority
  const delegator = await this.prisma.user.findUnique({ where: { id: delegatorId } });
  if (!this.hasApprovalAuthority(delegator)) {
    throw new ForbiddenException('You do not have approval authority to delegate');
  }

  // Validate delegate exists and is appropriate
  const delegate = await this.prisma.user.findUnique({ where: { id: dto.delegateId } });
  if (!delegate) {
    throw new NotFoundException('Delegate user not found');
  }

  // Check for overlapping delegations
  const existing = await this.prisma.approvalDelegation.findFirst({
    where: {
      delegatorId,
      status: 'ACTIVE',
      startDate: { lte: dto.endDate },
      endDate: { gte: dto.startDate },
    },
  });

  if (existing) {
    throw new ConflictException('Overlapping delegation already exists');
  }

  return this.prisma.approvalDelegation.create({
    data: {
      delegatorId,
      delegateId: dto.delegateId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      departmentIds: dto.departmentIds,
      maxAmount: dto.maxAmount,
      status: 'ACTIVE',
    },
  });
}

async function checkDelegation(
  approverId: string,
  tier: ApprovalTier
): Promise<string | null> {
  // Check if this approver is acting as delegate
  const delegation = await this.prisma.approvalDelegation.findFirst({
    where: {
      delegateId: approverId,
      status: 'ACTIVE',
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  });

  if (delegation) {
    return delegation.delegatorId; // Return original approver ID for audit
  }

  return null;
}
```

---

## Auto-Escalation

### Escalation Configuration

```typescript
const ESCALATION_CONFIG = {
  reminderAfterDays: 3,        // Send reminder after 3 days
  escalateAfterDays: 5,        // Escalate after 5 business days
  maxReminders: 2,             // Send max 2 reminders before escalation
};
```

### Escalation Logic

```typescript
// Run as scheduled job (daily)
async function processEscalations(): Promise<void> {
  const pendingExpenses = await this.prisma.expense.findMany({
    where: { status: ExpenseStatus.PENDING_APPROVAL },
    include: { approvalChain: true },
  });

  for (const expense of pendingExpenses) {
    const currentTier = this.getCurrentApprovalTier(expense);
    const daysPending = this.getBusinessDaysPending(expense, currentTier);

    // Send reminder
    if (daysPending >= ESCALATION_CONFIG.reminderAfterDays) {
      const reminderCount = await this.getReminderCount(expense.id, currentTier.id);

      if (reminderCount < ESCALATION_CONFIG.maxReminders) {
        await this.sendApprovalReminder(expense, currentTier);
        await this.recordReminder(expense.id, currentTier.id);
      }
    }

    // Escalate
    if (daysPending >= ESCALATION_CONFIG.escalateAfterDays) {
      await this.escalateApproval(expense, currentTier);
    }
  }
}

async function escalateApproval(
  expense: Expense,
  currentTier: ApprovalTier
): Promise<void> {
  // Find next tier approver
  const nextTier = await this.prisma.approvalTier.findFirst({
    where: {
      level: { gt: currentTier.level },
      isActive: true,
    },
    orderBy: { level: 'asc' },
  });

  if (!nextTier) {
    // No higher tier - notify admin
    await this.notifyAdmin('APPROVAL_STUCK', expense);
    return;
  }

  // Record escalation in history
  await this.prisma.approvalHistory.create({
    data: {
      entityType: 'EXPENSE',
      entityId: expense.id,
      tierId: currentTier.id,
      action: 'ESCALATED',
      comments: `Auto-escalated after ${ESCALATION_CONFIG.escalateAfterDays} business days`,
      isSystemAction: true,
    },
  });

  // Move to next tier
  expense.approvalChain.currentTierIndex++;
  await this.prisma.expense.update({
    where: { id: expense.id },
    data: expense,
  });

  // Notify
  await this.notifyEscalation(expense, currentTier, nextTier);
}
```

---

## Bulk Approval

```typescript
async function bulkApprove(
  approverId: string,
  expenseIds: string[],
  comments?: string
): Promise<BulkApprovalResult> {
  const results: BulkApprovalResult = {
    successful: [],
    failed: [],
  };

  for (const expenseId of expenseIds) {
    try {
      // Validate each expense can be approved by this user
      const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });
      const currentTier = this.getCurrentApprovalTier(expense);

      if (!await this.isAuthorizedApprover(approverId, currentTier, expense)) {
        results.failed.push({
          expenseId,
          reason: 'Not authorized to approve this expense',
        });
        continue;
      }

      // Process approval
      await this.processApproval(expenseId, approverId, 'APPROVE', comments);
      results.successful.push(expenseId);

    } catch (error) {
      results.failed.push({
        expenseId,
        reason: error.message,
      });
    }
  }

  // Record bulk action in audit log
  await this.prisma.auditLog.create({
    data: {
      userId: approverId,
      action: 'BULK_APPROVE',
      details: {
        totalAttempted: expenseIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    },
  });

  return results;
}
```

---

## Approval History

### History Model

```typescript
interface ApprovalHistory {
  id: string;

  // What was approved
  entityType: 'EXPENSE' | 'VOUCHER' | 'PRE_APPROVAL';
  entityId: string;

  // Approval details
  tierId: string;
  approverId: string;
  delegatedFromId?: string;   // If approved by delegate

  // Action
  action: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED' | 'ESCALATED' | 'RESUBMITTED';
  comments?: string;

  // System actions
  isSystemAction: boolean;    // True for auto-escalation

  createdAt: Date;
}
```

### Tracking Full History

```typescript
async function getApprovalHistory(
  entityType: string,
  entityId: string
): Promise<ApprovalTimeline> {
  const history = await this.prisma.approvalHistory.findMany({
    where: { entityType, entityId },
    include: { approver: true, tier: true, delegatedFrom: true },
    orderBy: { createdAt: 'asc' },
  });

  return {
    entityId,
    timeline: history.map(h => ({
      timestamp: h.createdAt,
      action: h.action,
      actor: h.delegatedFromId
        ? `${h.approver.name} (on behalf of ${h.delegatedFrom.name})`
        : h.approver.name,
      tier: h.tier.name,
      comments: h.comments,
      isSystemAction: h.isSystemAction,
    })),
    currentStatus: this.deriveCurrentStatus(history),
  };
}
```

---

## Resubmission Flow

```typescript
async function resubmitExpense(
  expenseId: string,
  userId: string,
  updates: UpdateExpenseDto
): Promise<Expense> {
  const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });

  // Validate can resubmit
  const RESUBMITTABLE = [
    ExpenseStatus.REJECTED,
    ExpenseStatus.CLARIFICATION_REQUESTED,
  ];

  if (!RESUBMITTABLE.includes(expense.status)) {
    throw new BadRequestException('Expense cannot be resubmitted in current status');
  }

  if (expense.userId !== userId) {
    throw new ForbiddenException('You can only resubmit your own expenses');
  }

  // Record in history
  await this.prisma.approvalHistory.create({
    data: {
      entityType: 'EXPENSE',
      entityId: expenseId,
      action: 'RESUBMITTED',
      approverId: userId,
      comments: updates.resubmissionNote,
    },
  });

  // Notify first approver
  const firstTier = expense.approvalChain.tiers[0];
  await this.notifyApprover(expense, firstTier.approver, 'RESUBMITTED');

  // Reset approval chain and apply updates
  return this.prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...updates,
      status: ExpenseStatus.PENDING_APPROVAL,
      // Reset approval chain tiers
    },
  });
}
```

---

## Budget Exceeded Escalation

```typescript
async function handleBudgetExceeded(
  expense: Expense,
  budget: Budget
): Promise<void> {
  switch (budget.enforcement) {
    case 'HARD_BLOCK':
      throw new BadRequestException(
        `Cannot submit: Budget "${budget.name}" would be exceeded`
      );

    case 'SOFT_WARNING':
      expense.budgetExceeded = true;
      expense.budgetExceededNote = `Exceeds budget "${budget.name}"`;
      // Continue with normal approval
      break;

    case 'ESCALATE':
      // Add executive approval tier
      const executiveTier = await this.prisma.approvalTier.findFirst({
        where: { approverRole: 'executive' },
      });

      expense.approvalChain.tiers.push({
        tier: executiveTier,
        approver: await this.resolveApprover(executiveTier, expense.user, expense),
        status: 'PENDING',
        reason: 'Budget exceeded - requires executive approval',
      });
      break;
  }
}
```

---

## Notifications

### Notification Events

```typescript
const APPROVAL_NOTIFICATIONS = {
  PENDING_APPROVAL: {
    channel: ['email', 'in_app'],
    template: 'approval_request',
    recipients: (expense) => [expense.currentApprover],
  },
  APPROVED: {
    channel: ['email', 'in_app'],
    template: 'expense_approved',
    recipients: (expense) => [expense.user],
  },
  REJECTED: {
    channel: ['email', 'in_app'],
    template: 'expense_rejected',
    recipients: (expense) => [expense.user],
  },
  CLARIFICATION_REQUESTED: {
    channel: ['email', 'in_app'],
    template: 'clarification_requested',
    recipients: (expense) => [expense.user],
  },
  REMINDER: {
    channel: ['email'],
    template: 'approval_reminder',
    recipients: (expense) => [expense.currentApprover],
  },
  ESCALATED: {
    channel: ['email', 'in_app'],
    template: 'approval_escalated',
    recipients: (expense) => [expense.previousApprover, expense.currentApprover],
  },
  DELEGATION_STARTED: {
    channel: ['email'],
    template: 'delegation_started',
    recipients: (delegation) => [delegation.delegate],
  },
};
```
