# Budgets Module

## Overview
Comprehensive budget tracking with utilization calculation, enforcement actions, budget transfers, and status management.

## Status: COMPLETE
- Completed: 2026-01-30
- Tests: 85 unit tests, E2E tests

## Key Files
- `budgets.service.ts` - Budget management and utilization calculation
- `budgets.controller.ts` - REST endpoints
- `dto/create-budget.dto.ts` - Budget creation DTO
- `dto/transfer-budget.dto.ts` - Budget transfer DTO
- `dto/check-expense.dto.ts` - Expense check DTO
- `dto/budget-responses.dto.ts` - Response DTOs and enums
- `budgets.service.spec.ts` - Unit tests

## Architecture

### Budget Types
- `ORGANIZATION` - Company-wide (Annual)
- `DEPARTMENT` - Per-department (Quarterly/Annual)
- `PROJECT` - Project-specific (Project duration)
- `COST_CENTER` - Operational cost tracking (Quarterly)
- `CATEGORY` - Category limits (Monthly/Quarterly)
- `EMPLOYEE` - Individual limits (Monthly)

### Budget Periods
- `ANNUAL` - Jan 1 to Dec 31
- `QUARTERLY` - Q1-Q4 (3-month periods)
- `MONTHLY` - Single month
- `PROJECT_BASED` - Custom start/end dates

### Utilization Calculation
```
Committed = sum(expenses with SUBMITTED, PENDING_APPROVAL, CLARIFICATION_REQUESTED, RESUBMITTED)
Spent = sum(expenses with APPROVED, PAID)
Available = Allocated - Committed - Spent
Utilization% = (Committed + Spent) / Allocated * 100
```

### Enforcement Types
- `HARD_BLOCK` - Prevents expense submission
- `SOFT_WARNING` - Allows with warning message
- `AUTO_ESCALATE` - Requires additional approval
- `NONE` - Tracking only

## Business Rules

1. **Utilization Tracking**: Separates committed (pending) from spent (approved)
2. **Warning Threshold**: Configurable percentage (default 80%)
3. **Budget Check**: Validates expense against all applicable budgets
4. **Transfer Validation**: Source must have sufficient available amount
5. **Status Transitions**: DRAFT → ACTIVE → CLOSED → ARCHIVED
6. **Period Validation**: Cannot activate budget with past end date

## API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /budgets | Create budget | FINANCE, ADMIN |
| GET | /budgets | List budgets | FINANCE, ADMIN |
| GET | /budgets/:id | Get budget | FINANCE, ADMIN |
| GET | /budgets/:id/utilization | Get utilization | FINANCE, ADMIN |
| PATCH | /budgets/:id | Update budget | FINANCE, ADMIN |
| DELETE | /budgets/:id | Soft delete | ADMIN |
| POST | /budgets/:id/activate | Activate budget | FINANCE, ADMIN |
| POST | /budgets/:id/close | Close budget | FINANCE, ADMIN |
| POST | /budgets/:id/archive | Archive budget | ADMIN |
| POST | /budgets/transfer | Transfer between budgets | FINANCE, ADMIN |
| POST | /budgets/check-expense | Check expense | All |
| GET | /budgets/summary | Summary report | FINANCE, ADMIN |
| GET | /budgets/period-dates | Calculate period dates | All |
| GET | /budgets/current-period | Get current period | All |

## Key Methods

### `calculateUtilization(budget)`
1. Build expense where clause based on budget type
2. Query expenses within budget period
3. Calculate committed and spent amounts
4. Return utilization metrics

### `checkBudgetForExpense(budgetId, amount)`
1. Get current utilization
2. Calculate projected utilization with new expense
3. Determine enforcement action
4. Return check result with canProceed flag

### `findApplicableBudgets(params)`
1. Check explicit budget assignment
2. Check department, project, cost center, category, employee budgets
3. Filter by active status and date range
4. Return all applicable budgets

### `transferBudget(dto, userId)`
1. Validate both budgets exist and are active
2. Validate source has sufficient available amount
3. Atomically update both budget amounts
4. Create audit log entries

## Dependencies
- `expenses` module - Expense amounts and status
- `departments`, `projects`, `categories` - Budget references
- Prisma model: Budget

## Testing
```bash
# Unit tests
npm run test -w @tpl-expense/api -- budgets.service

# E2E tests (requires database)
npm run test:e2e -w @tpl-expense/api -- budgets.e2e-spec
```

## Related Skills
- `.claude/skills/budget-tracking.md` - Full business rules and patterns
