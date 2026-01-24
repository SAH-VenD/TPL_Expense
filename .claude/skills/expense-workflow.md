# Expense Workflow Skill

Complete expense submission and approval workflow for TPL Expense.

## Expense Lifecycle

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → PAID
                 ↓                   ↓
         CLARIFICATION_REQUESTED  REJECTED
                 ↓
            RESUBMITTED → PENDING_APPROVAL
```

## Expense Number Generation

```typescript
async generateExpenseNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await this.prisma.$transaction(async (tx) => {
    const result = await tx.sequenceCounter.upsert({
      where: { name_year: { name: 'expense', year } },
      create: { name: 'expense', prefix: 'EXP', year, currentValue: 1 },
      update: { currentValue: { increment: 1 } },
    });
    return result;
  });

  return `EXP-${year}-${String(counter.currentValue).padStart(5, '0')}`;
}
```

## Expense Creation

```typescript
async createExpense(userId: string, dto: CreateExpenseDto) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { department: true },
  });

  // Calculate submission deadline (10 business days)
  const submissionDeadline = this.calculateDeadline(dto.expenseDate, 10);

  // Check if overdue
  const isOverdue = new Date() > submissionDeadline;

  // Calculate amounts
  const taxAmount = dto.taxAmount ?? 0;
  const totalAmount = dto.amount + taxAmount;

  // Handle currency conversion
  let exchangeRate = null;
  let amountInPKR = totalAmount;

  if (dto.currency !== 'PKR') {
    exchangeRate = await this.getExchangeRate(dto.currency, 'PKR');
    amountInPKR = totalAmount * exchangeRate;
  }

  const expenseNumber = await this.generateExpenseNumber();

  return this.prisma.expense.create({
    data: {
      expenseNumber,
      type: dto.type,
      status: 'DRAFT',
      submitterId: userId,
      categoryId: dto.categoryId,
      departmentId: user.departmentId,
      expenseDate: dto.expenseDate,
      currency: dto.currency,
      amount: dto.amount,
      taxType: dto.taxType,
      taxAmount,
      totalAmount,
      exchangeRate,
      amountInPKR,
      description: dto.description,
      vendorName: dto.vendorName,
      projectId: dto.projectId,
      costCenterId: dto.costCenterId,
      submissionDeadline,
      isOverdue,
    },
    include: {
      category: true,
      submitter: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}
```

## Expense Submission

```typescript
async submitExpense(userId: string, expenseId: string) {
  const expense = await this.prisma.expense.findUnique({
    where: { id: expenseId },
    include: { receipts: true, category: true, submitter: true },
  });

  // Validations
  if (expense.submitterId !== userId) {
    throw new ForbiddenException('Cannot submit another user\'s expense');
  }

  if (expense.status !== 'DRAFT' && expense.status !== 'CLARIFICATION_REQUESTED') {
    throw new BadRequestException('Expense cannot be submitted in current status');
  }

  if (expense.category.requiresReceipt && expense.receipts.length === 0) {
    throw new BadRequestException('Receipt required for this category');
  }

  // Check pre-approval requirement
  if (expense.category.requiresPreApproval && !expense.preApprovalId) {
    throw new BadRequestException('Pre-approval required for this category');
  }

  // Check budget
  const budgetCheck = await this.checkBudget(expense);
  if (budgetCheck.exceeded && budgetCheck.enforcement === 'HARD_BLOCK') {
    throw new BadRequestException('Budget exceeded. Cannot submit expense.');
  }

  // Check duplicate
  const isDuplicate = await this.checkDuplicate(expense);

  // Determine first approver (reporting manager)
  const approver = await this.prisma.user.findUnique({
    where: { id: expense.submitter.managerId },
  });

  if (!approver) {
    throw new BadRequestException('No reporting manager configured');
  }

  // Update expense
  const updated = await this.prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'PENDING_APPROVAL',
      submittedAt: new Date(),
      isDuplicate,
    },
  });

  // Send notification to approver
  await this.notificationService.sendExpenseSubmitted(expense, approver);

  return updated;
}
```

## Approval Flow

```typescript
async approveExpense(approverId: string, expenseId: string, comment?: string) {
  const expense = await this.prisma.expense.findUnique({
    where: { id: expenseId },
    include: { submitter: true },
  });

  // Validate approver authority
  const canApprove = await this.canApprove(approverId, expense);
  if (!canApprove) {
    throw new ForbiddenException('Not authorized to approve this expense');
  }

  // Determine current tier
  const tier = await this.getApprovalTier(expense.amountInPKR);

  // Check if more approvals needed
  const nextTier = await this.getNextApprovalTier(expense.amountInPKR, tier.tierOrder);

  const newStatus = nextTier ? 'PENDING_APPROVAL' : 'APPROVED';

  // Record approval
  await this.prisma.approvalHistory.create({
    data: {
      expenseId,
      approverId,
      action: 'APPROVED',
      tierLevel: tier.tierOrder,
      comment,
    },
  });

  // Update expense
  const updated = await this.prisma.expense.update({
    where: { id: expenseId },
    data: { status: newStatus },
  });

  // Update budget if approved
  if (newStatus === 'APPROVED') {
    await this.updateBudgetUtilization(expense);
    await this.notificationService.sendExpenseApproved(expense);
  } else {
    // Notify next tier approver
    const nextApprover = await this.getNextApprover(expense, nextTier);
    await this.notificationService.sendExpenseSubmitted(expense, nextApprover);
  }

  return updated;
}

async rejectExpense(approverId: string, expenseId: string, reason: string) {
  if (!reason || reason.trim().length === 0) {
    throw new BadRequestException('Rejection reason is required');
  }

  const expense = await this.prisma.expense.findUnique({
    where: { id: expenseId },
  });

  const tier = await this.getApprovalTier(expense.amountInPKR);

  await this.prisma.approvalHistory.create({
    data: {
      expenseId,
      approverId,
      action: 'REJECTED',
      tierLevel: tier.tierOrder,
      comment: reason,
    },
  });

  const updated = await this.prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
    },
  });

  await this.notificationService.sendExpenseRejected(expense, reason);

  return updated;
}

async requestClarification(approverId: string, expenseId: string, note: string) {
  const expense = await this.prisma.expense.findUnique({
    where: { id: expenseId },
  });

  const tier = await this.getApprovalTier(expense.amountInPKR);

  await this.prisma.approvalHistory.create({
    data: {
      expenseId,
      approverId,
      action: 'CLARIFICATION_REQUESTED',
      tierLevel: tier.tierOrder,
      comment: note,
    },
  });

  const updated = await this.prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'CLARIFICATION_REQUESTED',
      clarificationNote: note,
    },
  });

  await this.notificationService.sendClarificationRequested(expense, note);

  return updated;
}
```

## Approval Tier Logic

```typescript
async getApprovalTier(amountInPKR: number) {
  return this.prisma.approvalTier.findFirst({
    where: {
      isActive: true,
      minAmount: { lte: amountInPKR },
      OR: [
        { maxAmount: { gte: amountInPKR } },
        { maxAmount: null },
      ],
    },
    orderBy: { tierOrder: 'asc' },
  });
}

async canApprove(approverId: string, expense: Expense): Promise<boolean> {
  const approver = await this.prisma.user.findUnique({
    where: { id: approverId },
  });

  // Check if reporting manager
  if (expense.submitter.managerId === approverId) {
    return true;
  }

  // Check if approver has required role for tier
  const tier = await this.getApprovalTier(expense.amountInPKR);
  if (approver.role === tier.approverRole) {
    return true;
  }

  // Check delegation
  const delegation = await this.prisma.approvalDelegation.findFirst({
    where: {
      toUserId: approverId,
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      fromUser: { id: expense.submitter.managerId },
    },
  });

  return !!delegation;
}
```

## Budget Check

```typescript
async checkBudget(expense: Expense) {
  const budget = await this.prisma.budget.findFirst({
    where: {
      isActive: true,
      startDate: { lte: expense.expenseDate },
      endDate: { gte: expense.expenseDate },
      OR: [
        { departmentId: expense.departmentId },
        { projectId: expense.projectId },
        { categoryId: expense.categoryId },
        { employeeId: expense.submitterId },
      ],
    },
  });

  if (!budget) {
    return { hasBudget: false };
  }

  const utilizationAfter = Number(budget.usedAmount) + Number(expense.amountInPKR);
  const utilizationPercent = (utilizationAfter / Number(budget.totalAmount)) * 100;

  return {
    hasBudget: true,
    budget,
    utilizationPercent,
    exceeded: utilizationPercent > 100,
    warning: utilizationPercent >= Number(budget.warningThreshold),
    enforcement: budget.enforcement,
  };
}
```

## Duplicate Detection

```typescript
async checkDuplicate(expense: Expense): Promise<boolean> {
  // Check by amount + date + vendor
  const duplicate = await this.prisma.expense.findFirst({
    where: {
      id: { not: expense.id },
      submitterId: expense.submitterId,
      totalAmount: expense.totalAmount,
      expenseDate: expense.expenseDate,
      vendorName: expense.vendorName,
      status: { notIn: ['DRAFT', 'REJECTED'] },
    },
  });

  if (duplicate) return true;

  // Check receipt hash
  if (expense.receipts?.length > 0) {
    const hashes = expense.receipts.map(r => r.fileHash).filter(Boolean);
    const hashDuplicate = await this.prisma.receipt.findFirst({
      where: {
        fileHash: { in: hashes },
        expense: {
          id: { not: expense.id },
          submitterId: expense.submitterId,
        },
      },
    });
    return !!hashDuplicate;
  }

  return false;
}
```

## Resubmission

```typescript
async resubmitExpense(userId: string, expenseId: string, updates: UpdateExpenseDto) {
  const expense = await this.prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (expense.submitterId !== userId) {
    throw new ForbiddenException('Cannot resubmit another user\'s expense');
  }

  if (expense.status !== 'CLARIFICATION_REQUESTED' && expense.status !== 'REJECTED') {
    throw new BadRequestException('Expense cannot be resubmitted in current status');
  }

  return this.prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...updates,
      status: 'RESUBMITTED',
      clarificationNote: null,
      submittedAt: new Date(),
    },
  });
}
```
