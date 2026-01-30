# Skill: Voucher Management

## Context
This skill contains the business rules and implementation patterns for petty cash voucher management. Reference this when implementing voucher-related functionality including requests, disbursement, and settlement.

---

## Core Concepts

### Voucher Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  REQUESTED  │───►│  APPROVED   │───►│  DISBURSED  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  │
┌─────────────┐    ┌─────────────┐           │
│  REJECTED   │    │  CANCELLED  │           │
└─────────────┘    └─────────────┘           │
                                             ▼
                                    ┌─────────────┐
                   ┌───────────────►│  PARTIALLY  │
                   │                │  SETTLED    │
                   │                └──────┬──────┘
                   │                       │
                   │                       ▼
            ┌──────┴──────┐         ┌─────────────┐
            │   OVERDUE   │◄────────│   SETTLED   │
            └─────────────┘         └─────────────┘
```

### Voucher vs Expense Relationship

```
Voucher (one) ─────────────► Expenses (many)
    │
    │  Petty cash is disbursed
    │  Employee makes purchases
    │  Submits receipts as expenses linked to voucher
    │  System reconciles total expenses vs disbursed amount
    │
    └─► Settlement = Sum(expenses) vs Disbursed Amount
```

---

## Data Models

### Voucher Entity

```typescript
interface Voucher {
  id: string;

  // Identification
  voucherNumber: string;           // Auto-generated, sequential (e.g., PC-2026-0001)

  // Ownership
  userId: string;                  // Who requested
  departmentId: string;            // Auto from user

  // Request Details
  requestedAmount: number;
  currency: string;                // Always PKR for petty cash
  purpose: string;

  // Disbursement
  disbursedAmount?: number;        // May differ from requested
  disbursedAt?: Date;
  disbursedById?: string;          // Who handed out the cash

  // Settlement
  settlementDeadline: Date;
  settledAt?: Date;
  settledById?: string;

  // Calculated Fields
  totalExpensesAmount: number;     // Sum of linked expenses
  balance: number;                 // disbursed - expenses

  // Overspend Handling
  overspendApproved: boolean;
  overspendApprovedById?: string;
  overspendAmount?: number;

  // Status
  status: VoucherStatus;

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Relations
  expenses: Expense[];
  approvalHistory: ApprovalHistory[];
}

enum VoucherStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  DISBURSED = 'DISBURSED',
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  SETTLED = 'SETTLED',
  OVERDUE = 'OVERDUE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
```

---

## Business Rules

### Request Rules

```typescript
// Rule 1: Requested amount must be positive
if (requestedAmount <= 0) {
  throw new BadRequestException('Requested amount must be positive');
}

// Rule 2: Cannot have multiple open vouchers
const openVoucher = await this.prisma.voucher.findFirst({
  where: {
    userId,
    status: { in: [VoucherStatus.REQUESTED, VoucherStatus.APPROVED, VoucherStatus.DISBURSED] },
  },
});

if (openVoucher) {
  throw new BadRequestException('You already have an open petty cash voucher. Please settle it first.');
}

// Rule 3: Maximum request amount (configurable)
const MAX_PETTY_CASH_AMOUNT = 50000; // PKR
if (requestedAmount > MAX_PETTY_CASH_AMOUNT) {
  throw new BadRequestException(`Maximum petty cash request is PKR ${MAX_PETTY_CASH_AMOUNT}`);
}

// Rule 4: Purpose is required
if (!purpose || purpose.trim().length < 10) {
  throw new BadRequestException('Please provide a detailed purpose (minimum 10 characters)');
}
```

### Disbursement Rules

```typescript
// Rule 1: Can only disburse approved vouchers
if (voucher.status !== VoucherStatus.APPROVED) {
  throw new BadRequestException('Only approved vouchers can be disbursed');
}

// Rule 2: Disbursed amount can be less than or equal to requested
if (disbursedAmount > voucher.requestedAmount) {
  throw new BadRequestException('Disbursed amount cannot exceed requested amount');
}

// Rule 3: Only finance can disburse
if (!user.hasPermission('voucher:disburse')) {
  throw new ForbiddenException('Only finance team can disburse petty cash');
}

// Rule 4: Calculate settlement deadline
const SETTLEMENT_DEADLINE_DAYS = 7;
voucher.settlementDeadline = addBusinessDays(new Date(), SETTLEMENT_DEADLINE_DAYS);
```

### Settlement Rules

```typescript
// Rule 1: Can only settle disbursed vouchers
if (voucher.status !== VoucherStatus.DISBURSED &&
    voucher.status !== VoucherStatus.PARTIALLY_SETTLED) {
  throw new BadRequestException('Voucher is not ready for settlement');
}

// Rule 2: Calculate totals
const linkedExpenses = await this.prisma.expense.findMany({
  where: {
    voucherId: voucher.id,
    status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.SETTLED] },
  },
});

const totalExpenses = linkedExpenses.reduce((sum, e) => sum + e.pkrAmount, 0);
voucher.totalExpensesAmount = totalExpenses;
voucher.balance = voucher.disbursedAmount - totalExpenses;

// Rule 3: Handle overspend
if (voucher.balance < 0) {
  // Employee spent more than disbursed
  if (!voucher.overspendApproved) {
    throw new BadRequestException(
      `Expenses exceed disbursed amount by PKR ${Math.abs(voucher.balance)}. ` +
      'Overspend approval required.'
    );
  }
}

// Rule 4: Handle underspend
if (voucher.balance > 0) {
  // Employee needs to return unused cash
  voucher.returnAmount = voucher.balance;
}
```

---

## Voucher Flow Implementation

### Create Voucher Request

```typescript
async function createVoucherRequest(
  userId: string,
  dto: CreateVoucherDto
): Promise<Voucher> {
  // Validate user doesn't have open voucher
  await this.validateNoOpenVoucher(userId);

  // Generate voucher number
  const voucherNumber = await this.generateVoucherNumber();

  // Get user's department
  const user = await this.prisma.user.findUnique({ where: { id: userId } });

  // Create voucher
  const voucher = await this.prisma.voucher.create({
    data: {
      voucherNumber,
      userId,
      departmentId: user.departmentId,
      requestedAmount: dto.requestedAmount,
      currency: 'PKR',
      purpose: dto.purpose,
      status: VoucherStatus.REQUESTED,
    },
  });

  // Trigger approval workflow (same as expenses)
  await this.approvalService.initiateApproval({
    entityType: 'VOUCHER',
    entityId: voucher.id,
    amount: voucher.requestedAmount,
    userId,
  });

  // Notify approvers
  await this.notificationService.notifyApprovers(voucher);

  return voucher;
}
```

### Disburse Voucher

```typescript
async function disburseVoucher(
  voucherId: string,
  disbursedAmount: number,
  disburserId: string
): Promise<Voucher> {
  const voucher = await this.prisma.voucher.findUnique({ where: { id: voucherId } });

  // Validate
  if (voucher.status !== VoucherStatus.APPROVED) {
    throw new BadRequestException('Voucher must be approved before disbursement');
  }

  if (disbursedAmount > voucher.requestedAmount) {
    throw new BadRequestException('Cannot disburse more than requested amount');
  }

  // Update voucher
  const updated = await this.prisma.voucher.update({
    where: { id: voucherId },
    data: {
      disbursedAmount,
      disbursedAt: new Date(),
      disbursedById: disburserId,
      status: VoucherStatus.DISBURSED,
      settlementDeadline: this.calculateDeadline(),
    },
  });

  // Record transaction
  await this.transactionService.recordDisbursement(updated);

  // Notify employee
  await this.notificationService.notifyDisbursement(updated);

  return updated;
}
```

### Settle Voucher

```typescript
async function settleVoucher(
  voucherId: string,
  settlerUserId: string,
  settlementDto: SettleVoucherDto
): Promise<Voucher> {
  const voucher = await this.prisma.voucher.findUnique({
    where: { id: voucherId },
    include: { expenses: true, user: true },
  });

  // Validate status
  const SETTLEABLE = [VoucherStatus.DISBURSED, VoucherStatus.PARTIALLY_SETTLED];
  if (!SETTLEABLE.includes(voucher.status)) {
    throw new BadRequestException('Voucher is not ready for settlement');
  }

  // Validate all expenses are approved
  const pendingExpenses = voucher.expenses.filter(
    e => e.status === ExpenseStatus.PENDING_APPROVAL
  );
  if (pendingExpenses.length > 0) {
    throw new BadRequestException(
      `${pendingExpenses.length} expense(s) still pending approval`
    );
  }

  // Calculate final amounts
  await this.updateVoucherTotals(voucherId);

  // Handle overspend
  if (voucher.balance < 0) {
    if (!settlementDto.overspendJustification) {
      throw new BadRequestException(
        'Overspend justification required for settlement'
      );
    }
  }

  // Handle underspend (cash return)
  if (voucher.balance > 0) {
    if (!settlementDto.cashReturnConfirmed) {
      throw new BadRequestException(
        `Please confirm return of PKR ${voucher.balance} unused cash`
      );
    }
  }

  // Finalize settlement
  const settled = await this.prisma.voucher.update({
    where: { id: voucherId },
    data: {
      status: VoucherStatus.SETTLED,
      settledAt: new Date(),
      settledById: settlerUserId,
    },
  });

  // Record in accounting
  await this.accountingService.recordVoucherSettlement(settled);

  // Notify employee
  await this.notificationService.notifySettlement(settled);

  return settled;
}
```

---

## Overdue Handling

### Scheduled Job

```typescript
@Cron('0 9 * * *') // Daily at 9 AM
async function processOverdueVouchers(): Promise<void> {
  const today = new Date();

  // Find vouchers past deadline
  const overdueVouchers = await this.prisma.voucher.findMany({
    where: {
      status: { in: [VoucherStatus.DISBURSED, VoucherStatus.PARTIALLY_SETTLED] },
      settlementDeadline: { lt: today },
    },
    include: { user: true },
  });

  for (const voucher of overdueVouchers) {
    // Update status
    await this.prisma.voucher.update({
      where: { id: voucher.id },
      data: { status: VoucherStatus.OVERDUE },
    });

    // Notify employee
    await this.notificationService.send({
      userId: voucher.userId,
      type: 'VOUCHER_OVERDUE',
      title: 'Petty Cash Voucher Overdue',
      message: `Voucher ${voucher.voucherNumber} is overdue for settlement. Please settle immediately.`,
      data: { voucherId: voucher.id },
    });

    // Notify employee's manager
    if (voucher.user.reportingManagerId) {
      await this.notificationService.send({
        userId: voucher.user.reportingManagerId,
        type: 'TEAM_VOUCHER_OVERDUE',
        title: 'Team Member Voucher Overdue',
        message: `${voucher.user.fullName}'s voucher ${voucher.voucherNumber} is overdue.`,
        data: { voucherId: voucher.id },
      });
    }
  }
}
```

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| `POST` | `/api/v1/vouchers` | Create voucher request | Required | Employee |
| `GET` | `/api/v1/vouchers` | List user's vouchers | Required | Employee |
| `GET` | `/api/v1/vouchers/:id` | Get voucher details | Required | Owner, Finance, Admin |
| `PUT` | `/api/v1/vouchers/:id` | Update draft voucher | Required | Owner |
| `DELETE` | `/api/v1/vouchers/:id` | Cancel voucher | Required | Owner (before disburse) |
| `POST` | `/api/v1/vouchers/:id/approve` | Approve voucher | Required | Approver |
| `POST` | `/api/v1/vouchers/:id/reject` | Reject voucher | Required | Approver |
| `POST` | `/api/v1/vouchers/:id/disburse` | Disburse cash | Required | Finance |
| `POST` | `/api/v1/vouchers/:id/settle` | Settle voucher | Required | Finance |
| `POST` | `/api/v1/vouchers/:id/expenses` | Link expense to voucher | Required | Owner |
| `GET` | `/api/v1/vouchers/pending-approval` | List pending approvals | Required | Approver |
| `GET` | `/api/v1/vouchers/outstanding` | List all outstanding | Required | Finance, Admin |
| `GET` | `/api/v1/vouchers/overdue` | List overdue vouchers | Required | Finance, Admin |

---

## Configuration

### Environment Variables

```bash
# Voucher Settings
VOUCHER_NUMBER_PREFIX=PC                    # Prefix for voucher numbers
VOUCHER_SETTLEMENT_DAYS=7                   # Days to settle after disbursement
VOUCHER_MAX_AMOUNT=50000                    # Maximum request amount (PKR)
VOUCHER_REMINDER_DAYS=3,1                   # Days before deadline to send reminders
VOUCHER_ALLOW_MULTIPLE_OPEN=false           # Allow multiple open vouchers per user
```

---

## Error Messages

```typescript
const VOUCHER_ERRORS = {
  // General
  NOT_FOUND: 'Voucher not found',
  NOT_OWNER: 'You can only access your own vouchers',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',

  // Request
  OPEN_VOUCHER_EXISTS: 'You already have an open petty cash voucher',
  MAX_AMOUNT_EXCEEDED: 'Maximum petty cash amount exceeded',
  PURPOSE_TOO_SHORT: 'Please provide a detailed purpose (minimum 10 characters)',
  AMOUNT_MUST_BE_POSITIVE: 'Requested amount must be positive',

  // Disbursement
  CANNOT_DISBURSE: 'Voucher must be approved before disbursement',
  DISBURSE_EXCEEDS_REQUESTED: 'Cannot disburse more than requested amount',
  ALREADY_DISBURSED: 'Voucher has already been disbursed',

  // Settlement
  NOT_READY_FOR_SETTLEMENT: 'Voucher is not ready for settlement',
  PENDING_EXPENSES_EXIST: 'Some expenses are still pending approval',
  OVERSPEND_JUSTIFICATION_REQUIRED: 'Overspend justification required',
  CASH_RETURN_NOT_CONFIRMED: 'Please confirm cash return',
  ALREADY_SETTLED: 'Voucher has already been settled',

  // Linking Expenses
  VOUCHER_NOT_DISBURSED: 'Voucher must be disbursed before linking expenses',
  EXPENSE_NOT_PETTY_CASH: 'Only petty cash expenses can be linked to vouchers',
};
```
