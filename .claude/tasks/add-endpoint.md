# Task: Add API Endpoint

## Overview
Step-by-step guide to adding a new API endpoint.

---

## Step 1: Define the DTO

```typescript
// packages/api/src/modules/[module]/dto/[action].dto.ts

import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitExpenseDto {
  @ApiProperty({ description: 'ID of the expense to submit' })
  @IsUUID()
  expenseId: string;

  @ApiPropertyOptional({ description: 'Optional note' })
  @IsString()
  @IsOptional()
  note?: string;
}
```

---

## Step 2: Add Service Method

```typescript
// packages/api/src/modules/[module]/[module].service.ts

async submitExpense(userId: string, dto: SubmitExpenseDto) {
  // 1. Fetch entity
  const expense = await this.prisma.expense.findFirst({
    where: { id: dto.expenseId },
    include: { receipts: true },
  });

  // 2. Validate ownership
  if (!expense) {
    throw new NotFoundException('Expense not found');
  }
  if (expense.submitterId !== userId) {
    throw new ForbiddenException('Not authorized');
  }

  // 3. Validate business rules
  if (expense.status !== ExpenseStatus.DRAFT) {
    throw new BadRequestException('Only draft expenses can be submitted');
  }

  // 4. Perform action
  return this.prisma.expense.update({
    where: { id: dto.expenseId },
    data: {
      status: ExpenseStatus.PENDING_APPROVAL,
      submittedAt: new Date(),
    },
  });
}
```

---

## Step 3: Add Controller Method

```typescript
// packages/api/src/modules/[module]/[module].controller.ts

@Post(':id/submit')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Submit expense for approval' })
@ApiResponse({ status: 200 })
async submitExpense(
  @CurrentUser('id') userId: string,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: SubmitExpenseDto,
) {
  return this.expensesService.submitExpense(userId, { ...dto, expenseId: id });
}
```

---

## Step 4: Write Tests

```typescript
// [module].service.spec.ts
describe('submitExpense', () => {
  it('should submit draft expense', async () => {
    // ...
  });

  it('should throw if not found', async () => {
    // ...
  });

  it('should throw if not owner', async () => {
    // ...
  });
});
```

---

## Endpoint Checklist

### Request Handling
- [ ] DTO with validation decorators
- [ ] Swagger decorators

### Controller
- [ ] Auth guard applied
- [ ] Input validation (ParseUUIDPipe, etc.)
- [ ] Swagger response decorators

### Service
- [ ] Ownership/permission checks
- [ ] Business rule validation
- [ ] Proper error types

### Testing
- [ ] Happy path test
- [ ] Auth required test
- [ ] Not found test
- [ ] Not authorized test
- [ ] Validation error tests
