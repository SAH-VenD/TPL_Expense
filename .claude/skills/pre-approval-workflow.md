# Skill: Pre-Approval Workflow

## Context
This skill contains the business rules and implementation patterns for expense pre-approval requests. Pre-approvals are required for certain expense categories (travel, equipment, training) before the actual expense can be submitted.

---

## Core Concepts

### Why Pre-Approval?

Pre-approval serves to:
1. Control spending before it happens
2. Ensure budget availability
3. Provide visibility to management
4. Comply with company policy

### Pre-Approval Lifecycle

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   REQUESTED   │ ──► │   APPROVED    │ ──► │     USED      │
└───────────────┘     └───────────────┘     └───────────────┘
        │                    │                      │
        │                    │                      │
        ▼                    ▼                      ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   REJECTED    │     │   CANCELLED   │     │    EXPIRED    │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `REQUESTED` | Submitted, awaiting approval |
| `APPROVED` | Approved, can be used for expenses |
| `REJECTED` | Denied by approver |
| `CANCELLED` | Cancelled by requester |
| `PARTIALLY_USED` | Some amount used, remainder available |
| `FULLY_USED` | Entire approved amount used |
| `EXPIRED` | Validity period passed without use |

---

## Data Models

### Pre-Approval Entity

```typescript
interface PreApproval {
  id: string;

  // Identification
  preApprovalNumber: string;     // Auto-generated (e.g., PA-2026-0001)

  // Requester
  userId: string;
  departmentId: string;

  // Request Details
  categoryId: string;            // Must be a pre-approval-required category
  purpose: string;               // Detailed description
  justification: string;         // Business justification

  // Financials
  requestedAmount: number;
  currency: string;
  approvedAmount?: number;       // May be less than requested
  usedAmount: number;            // Amount linked to expenses
  remainingAmount: number;       // approvedAmount - usedAmount

  // Timing
  requestedDate: Date;
  plannedExpenseDate?: Date;     // When expense is expected
  validFrom?: Date;              // When approval becomes valid
  validUntil: Date;              // Expiry date (default: 30 days)

  // Approval
  approvedById?: string;
  approvedAt?: Date;
  approvalComments?: string;

  // Status
  status: PreApprovalStatus;

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Relations
  expenses: Expense[];           // Linked expenses
  attachments: Attachment[];     // Supporting documents
}

enum PreApprovalStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_USED = 'PARTIALLY_USED',
  FULLY_USED = 'FULLY_USED',
  EXPIRED = 'EXPIRED'
}
```

---

## Business Rules

### Request Rules

```typescript
// Rule 1: Category must require pre-approval
const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
if (!category.requiresPreApproval) {
  throw new BadRequestException(
    'Pre-approval is not required for this category'
  );
}

// Rule 2: Amount must be positive
if (dto.requestedAmount <= 0) {
  throw new BadRequestException('Requested amount must be positive');
}

// Rule 3: Cannot have overlapping pre-approvals for same category
const existingApproval = await this.prisma.preApproval.findFirst({
  where: {
    userId: dto.userId,
    categoryId: dto.categoryId,
    status: { in: [PreApprovalStatus.REQUESTED, PreApprovalStatus.APPROVED] },
  },
});

if (existingApproval) {
  throw new BadRequestException(
    `You already have a pending/approved pre-approval for ${category.name}`
  );
}

// Rule 4: Justification is required
if (!dto.justification || dto.justification.length < 20) {
  throw new BadRequestException(
    'Please provide a detailed business justification (minimum 20 characters)'
  );
}
```

### Approval Rules

```typescript
// Rule 1: Only authorized approvers can approve
const isAuthorized = await this.checkApprovalAuthority(
  approverId,
  preApproval.requestedAmount,
  preApproval.categoryId
);

if (!isAuthorized) {
  throw new ForbiddenException('You are not authorized to approve this request');
}

// Rule 2: Approved amount cannot exceed requested amount
if (dto.approvedAmount > preApproval.requestedAmount) {
  throw new BadRequestException(
    'Approved amount cannot exceed requested amount'
  );
}

// Rule 3: Rejection requires reason
if (dto.action === 'REJECT' && !dto.reason) {
  throw new BadRequestException('Rejection reason is required');
}

// Rule 4: Set validity period on approval
const VALIDITY_DAYS = this.configService.get('PRE_APPROVAL_VALIDITY_DAYS', 30);
preApproval.validFrom = new Date();
preApproval.validUntil = addDays(new Date(), VALIDITY_DAYS);
```

### Usage Rules

```typescript
// Rule 1: Pre-approval must be approved
if (preApproval.status !== PreApprovalStatus.APPROVED &&
    preApproval.status !== PreApprovalStatus.PARTIALLY_USED) {
  throw new BadRequestException('Pre-approval is not valid for use');
}

// Rule 2: Pre-approval must not be expired
if (new Date() > preApproval.validUntil) {
  await this.prisma.preApproval.update({
    where: { id: preApproval.id },
    data: { status: PreApprovalStatus.EXPIRED },
  });
  throw new BadRequestException('Pre-approval has expired');
}

// Rule 3: Expense amount cannot exceed remaining amount
if (expense.pkrAmount > preApproval.remainingAmount) {
  throw new BadRequestException(
    `Expense exceeds remaining pre-approved amount. ` +
    `Available: ${preApproval.remainingAmount}, Requested: ${expense.pkrAmount}`
  );
}

// Rule 4: Category must match
if (expense.categoryId !== preApproval.categoryId) {
  throw new BadRequestException(
    'Expense category does not match pre-approval category'
  );
}

// Rule 5: Only requester can use their pre-approval
if (expense.userId !== preApproval.userId) {
  throw new ForbiddenException('You can only use your own pre-approvals');
}
```

---

## Implementation

### Create Pre-Approval Request

```typescript
async function createPreApprovalRequest(
  userId: string,
  dto: CreatePreApprovalDto
): Promise<PreApproval> {
  // Validate category requires pre-approval
  const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
  if (!category.requiresPreApproval) {
    throw new BadRequestException(
      `Pre-approval is not required for ${category.name}`
    );
  }

  // Check for existing active pre-approval
  await this.validateNoActivePreApproval(userId, dto.categoryId);

  // Get user's department
  const user = await this.prisma.user.findUnique({ where: { id: userId } });

  // Generate pre-approval number
  const preApprovalNumber = await this.generatePreApprovalNumber();

  // Create pre-approval
  const preApproval = await this.prisma.preApproval.create({
    data: {
      preApprovalNumber,
      userId,
      departmentId: user.departmentId,
      categoryId: dto.categoryId,
      purpose: dto.purpose,
      justification: dto.justification,
      requestedAmount: dto.requestedAmount,
      currency: dto.currency || 'PKR',
      plannedExpenseDate: dto.plannedExpenseDate,
      usedAmount: 0,
      remainingAmount: 0, // Set on approval
      status: PreApprovalStatus.REQUESTED,
    },
  });

  // Handle attachments
  if (dto.attachments?.length) {
    await this.attachmentService.linkToPreApproval(
      preApproval.id,
      dto.attachments
    );
  }

  // Trigger approval workflow
  await this.approvalService.initiateApproval({
    entityType: 'PRE_APPROVAL',
    entityId: preApproval.id,
    amount: preApproval.requestedAmount,
    userId,
  });

  // Notify approvers
  await this.notificationService.notifyApprovers(preApproval);

  return preApproval;
}
```

### Process Pre-Approval Decision

```typescript
async function processPreApprovalDecision(
  preApprovalId: string,
  approverId: string,
  dto: PreApprovalDecisionDto
): Promise<PreApproval> {
  const preApproval = await this.prisma.preApproval.findUnique({
    where: { id: preApprovalId },
    include: { user: true },
  });

  if (!preApproval) {
    throw new NotFoundException('Pre-approval not found');
  }

  if (preApproval.status !== PreApprovalStatus.REQUESTED) {
    throw new BadRequestException('Pre-approval has already been processed');
  }

  // Validate approver authority
  await this.validateApproverAuthority(approverId, preApproval);

  switch (dto.action) {
    case 'APPROVE':
      return this.approvePreApproval(preApproval, approverId, dto);

    case 'REJECT':
      return this.rejectPreApproval(preApproval, approverId, dto);

    default:
      throw new BadRequestException(`Unknown action: ${dto.action}`);
  }
}

async function approvePreApproval(
  preApproval: PreApproval,
  approverId: string,
  dto: PreApprovalDecisionDto
): Promise<PreApproval> {
  const approvedAmount = dto.approvedAmount || preApproval.requestedAmount;

  if (approvedAmount > preApproval.requestedAmount) {
    throw new BadRequestException(
      'Approved amount cannot exceed requested amount'
    );
  }

  // Set validity period
  const validityDays = this.configService.get('PRE_APPROVAL_VALIDITY_DAYS', 30);

  const updated = await this.prisma.preApproval.update({
    where: { id: preApproval.id },
    data: {
      status: PreApprovalStatus.APPROVED,
      approvedAmount,
      remainingAmount: approvedAmount,
      approvedById: approverId,
      approvedAt: new Date(),
      approvalComments: dto.comments,
      validFrom: new Date(),
      validUntil: addDays(new Date(), validityDays),
    },
  });

  // Record in approval history
  await this.prisma.approvalHistory.create({
    data: {
      entityType: 'PRE_APPROVAL',
      entityId: preApproval.id,
      approverId,
      action: 'APPROVED',
      comments: dto.comments,
      details: {
        requestedAmount: preApproval.requestedAmount,
        approvedAmount,
        validUntil: updated.validUntil,
      },
    },
  });

  // Notify requester
  await this.notificationService.send({
    userId: preApproval.userId,
    type: 'PRE_APPROVAL_APPROVED',
    title: 'Pre-Approval Approved',
    message: `Your pre-approval ${preApproval.preApprovalNumber} has been approved ` +
             `for ${formatCurrency(approvedAmount)}. Valid until ${formatDate(updated.validUntil)}.`,
    data: { preApprovalId: preApproval.id },
  });

  return updated;
}
```

### Link Expense to Pre-Approval

```typescript
async function linkExpenseToPreApproval(
  expense: Expense,
  preApprovalId: string
): Promise<void> {
  const preApproval = await this.prisma.preApproval.findUnique({
    where: { id: preApprovalId },
    include: { expenses: true },
  });

  // Validate pre-approval is usable
  this.validatePreApprovalUsable(preApproval, expense);

  // Link expense
  await this.prisma.expense.update({
    where: { id: expense.id },
    data: { preApprovalId },
  });

  // Update used amount
  const newUsedAmount = preApproval.usedAmount + expense.pkrAmount;
  const newRemainingAmount = preApproval.approvedAmount - newUsedAmount;

  // Update status
  let newStatus = preApproval.status;
  if (newRemainingAmount <= 0) {
    newStatus = PreApprovalStatus.FULLY_USED;
  } else if (newUsedAmount > 0) {
    newStatus = PreApprovalStatus.PARTIALLY_USED;
  }

  await this.prisma.preApproval.update({
    where: { id: preApprovalId },
    data: {
      usedAmount: newUsedAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
    },
  });
}

function validatePreApprovalUsable(
  preApproval: PreApproval,
  expense: Expense
): void {
  // Check status
  const usableStatuses = [
    PreApprovalStatus.APPROVED,
    PreApprovalStatus.PARTIALLY_USED,
  ];

  if (!usableStatuses.includes(preApproval.status)) {
    throw new BadRequestException('Pre-approval is not valid for use');
  }

  // Check expiry
  if (new Date() > preApproval.validUntil) {
    throw new BadRequestException('Pre-approval has expired');
  }

  // Check ownership
  if (expense.userId !== preApproval.userId) {
    throw new ForbiddenException('You can only use your own pre-approvals');
  }

  // Check category match
  if (expense.categoryId !== preApproval.categoryId) {
    throw new BadRequestException(
      'Expense category must match pre-approval category'
    );
  }

  // Check remaining amount
  if (expense.pkrAmount > preApproval.remainingAmount) {
    throw new BadRequestException(
      `Expense amount (${expense.pkrAmount}) exceeds remaining pre-approved ` +
      `amount (${preApproval.remainingAmount})`
    );
  }
}
```

---

## Expiration Handling

### Scheduled Job

```typescript
@Cron('0 0 * * *') // Daily at midnight
async function processExpiredPreApprovals(): Promise<void> {
  const now = new Date();

  // Find expired pre-approvals
  const expiredPreApprovals = await this.prisma.preApproval.findMany({
    where: {
      status: { in: [PreApprovalStatus.APPROVED, PreApprovalStatus.PARTIALLY_USED] },
      validUntil: { lt: now },
    },
    include: { user: true },
  });

  for (const preApproval of expiredPreApprovals) {
    // Update status
    await this.prisma.preApproval.update({
      where: { id: preApproval.id },
      data: { status: PreApprovalStatus.EXPIRED },
    });

    // Notify user
    await this.notificationService.send({
      userId: preApproval.userId,
      type: 'PRE_APPROVAL_EXPIRED',
      title: 'Pre-Approval Expired',
      message: `Your pre-approval ${preApproval.preApprovalNumber} has expired. ` +
               `Unused amount: ${formatCurrency(preApproval.remainingAmount)}`,
      data: { preApprovalId: preApproval.id },
    });
  }

  this.logger.log(
    `Processed ${expiredPreApprovals.length} expired pre-approvals`
  );
}
```

---

## Categories Requiring Pre-Approval

```typescript
const PRE_APPROVAL_CATEGORIES = [
  {
    code: 'TRV-AIR',
    name: 'Airfare',
    threshold: 0,              // Always requires pre-approval
    requiredDocuments: ['itinerary', 'meeting_invitation'],
    maxAdvanceDays: 60,        // Must be requested max 60 days in advance
  },
  {
    code: 'TRV-HTL',
    name: 'Hotel/Lodging',
    threshold: 0,
    requiredDocuments: ['booking_confirmation'],
    maxAdvanceDays: 60,
  },
  {
    code: 'MEL-CLT',
    name: 'Client Entertainment',
    threshold: 5000,           // Pre-approval if > PKR 5,000
    requiredDocuments: ['guest_list', 'meeting_purpose'],
    maxAdvanceDays: 14,
  },
  {
    code: 'OFS-SFT',
    name: 'Software Subscriptions',
    threshold: 10000,          // Pre-approval if > PKR 10,000
    requiredDocuments: ['software_justification'],
    maxAdvanceDays: 30,
  },
  {
    code: 'OFS-EQP',
    name: 'Equipment/Hardware',
    threshold: 25000,
    requiredDocuments: ['equipment_specification'],
    maxAdvanceDays: 30,
  },
  {
    code: 'PRD-TRN',
    name: 'Training & Certifications',
    threshold: 0,
    requiredDocuments: ['training_details', 'manager_endorsement'],
    maxAdvanceDays: 45,
  },
  {
    code: 'PRD-CNF',
    name: 'Conference Fees',
    threshold: 0,
    requiredDocuments: ['conference_details', 'agenda'],
    maxAdvanceDays: 60,
  },
];
```

---

## API Endpoints

```typescript
// Create pre-approval request
POST /api/v1/pre-approvals
Body: CreatePreApprovalDto

// Get user's pre-approvals
GET /api/v1/pre-approvals
Query: ?status=APPROVED&categoryId=xxx

// Get single pre-approval
GET /api/v1/pre-approvals/:id

// Process decision (approve/reject)
POST /api/v1/pre-approvals/:id/decision
Body: { action: 'APPROVE' | 'REJECT', approvedAmount?, reason? }

// Cancel pre-approval (by requester)
POST /api/v1/pre-approvals/:id/cancel

// Get available pre-approvals for expense creation
GET /api/v1/pre-approvals/available
Query: ?categoryId=xxx

// Get pending approvals (for approvers)
GET /api/v1/pre-approvals/pending
```

---

## Error Messages

```typescript
const PRE_APPROVAL_ERRORS = {
  NOT_FOUND: 'Pre-approval not found',
  NOT_REQUIRED: 'Pre-approval is not required for this category',
  ALREADY_EXISTS: 'You already have an active pre-approval for this category',
  ALREADY_PROCESSED: 'Pre-approval has already been processed',
  NOT_VALID: 'Pre-approval is not valid for use',
  EXPIRED: 'Pre-approval has expired',
  INSUFFICIENT_AMOUNT: 'Expense exceeds remaining pre-approved amount',
  CATEGORY_MISMATCH: 'Expense category does not match pre-approval',
  NOT_OWNER: 'You can only use your own pre-approvals',
  AMOUNT_EXCEEDS_REQUESTED: 'Approved amount cannot exceed requested amount',
  JUSTIFICATION_REQUIRED: 'Business justification is required',
  REJECTION_REASON_REQUIRED: 'Rejection reason is required',
};
```
