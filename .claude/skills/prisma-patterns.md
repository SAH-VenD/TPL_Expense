# Prisma Patterns Skill

Common Prisma patterns used in TPL Expense API.

## Connection

```typescript
// Already set up in src/common/prisma/prisma.service.ts
import { PrismaService } from '@/common/prisma/prisma.service';

constructor(private readonly prisma: PrismaService) {}
```

## Common Query Patterns

### Pagination

```typescript
async findAllPaginated(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    this.prisma.expense.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.expense.count(),
  ]);

  return {
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  };
}
```

### Filtering

```typescript
async findWithFilters(filters: ExpenseFilters) {
  const where: Prisma.ExpenseWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.expenseDate = {
      ...(filters.dateFrom && { gte: filters.dateFrom }),
      ...(filters.dateTo && { lte: filters.dateTo }),
    };
  }

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { vendorName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return this.prisma.expense.findMany({ where });
}
```

### Include Relations

```typescript
async findOneWithRelations(id: string) {
  return this.prisma.expense.findUnique({
    where: { id },
    include: {
      submitter: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      category: true,
      receipts: true,
      approvalHistory: {
        include: {
          approver: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      comments: {
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
```

### Transaction

```typescript
async createWithReceipts(data: CreateExpenseDto, receipts: Receipt[]) {
  return this.prisma.$transaction(async (tx) => {
    // Generate expense number
    const counter = await tx.sequenceCounter.upsert({
      where: { name_year: { name: 'expense', year: new Date().getFullYear() } },
      create: { name: 'expense', prefix: 'EXP', year: new Date().getFullYear(), currentValue: 1 },
      update: { currentValue: { increment: 1 } },
    });

    const expenseNumber = `EXP-${counter.year}-${String(counter.currentValue).padStart(5, '0')}`;

    // Create expense
    const expense = await tx.expense.create({
      data: {
        ...data,
        expenseNumber,
      },
    });

    // Create receipts
    if (receipts.length > 0) {
      await tx.receipt.createMany({
        data: receipts.map((r) => ({ ...r, expenseId: expense.id })),
      });
    }

    return expense;
  });
}
```

### Soft Delete Pattern

```typescript
// Mark as inactive instead of delete
async softDelete(id: string) {
  return this.prisma.expense.update({
    where: { id },
    data: {
      status: ExpenseStatus.DELETED,
      deletedAt: new Date(),
    },
  });
}

// Query active only
async findActive() {
  return this.prisma.expense.findMany({
    where: { status: { not: ExpenseStatus.DELETED } },
  });
}
```

### Aggregate Queries

```typescript
async getSpendingSummary(userId: string) {
  const result = await this.prisma.expense.aggregate({
    where: {
      submitterId: userId,
      status: ExpenseStatus.APPROVED,
    },
    _sum: { totalAmount: true },
    _count: true,
    _avg: { totalAmount: true },
  });

  return {
    totalSpent: result._sum.totalAmount ?? 0,
    expenseCount: result._count,
    averageExpense: result._avg.totalAmount ?? 0,
  };
}
```

### Group By

```typescript
async getSpendingByCategory(userId: string) {
  const result = await this.prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      submitterId: userId,
      status: ExpenseStatus.APPROVED,
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  return result;
}
```

### Update with Optimistic Locking

```typescript
async updateWithVersion(id: string, data: UpdateExpenseDto, version: number) {
  const result = await this.prisma.expense.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new ConflictException('Record was modified by another user');
  }

  return this.findOne(id);
}
```

## Key Models Reference

### User Query Patterns
```typescript
// Find with role check
await this.prisma.user.findFirst({
  where: { id: userId, role: { in: [RoleType.ADMIN, RoleType.FINANCE] } },
});

// Find with manager hierarchy
await this.prisma.user.findUnique({
  where: { id: userId },
  include: { manager: true, directReports: true },
});
```

### Expense Query Patterns
```typescript
// Find pending approvals for approver
await this.prisma.expense.findMany({
  where: {
    status: ExpenseStatus.PENDING_APPROVAL,
    submitter: { managerId: approverId },
  },
});
```

### Budget Query Patterns
```typescript
// Check budget utilization
const budget = await this.prisma.budget.findFirst({
  where: {
    departmentId,
    startDate: { lte: expenseDate },
    endDate: { gte: expenseDate },
    isActive: true,
  },
});

const utilizationPercent = budget
  ? (Number(budget.usedAmount) / Number(budget.totalAmount)) * 100
  : 0;
```
