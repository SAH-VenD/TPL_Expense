# Vouchers Module

## Overview
Petty cash voucher management with complete lifecycle from request to settlement, including expense linking and overspend/underspend handling.

## Status: COMPLETE
- Completed: 2026-01-30
- Tests: 114 unit tests, E2E tests

## Key Files
- `vouchers.service.ts` - Voucher lifecycle and business logic
- `vouchers.controller.ts` - REST endpoints
- `dto/create-voucher.dto.ts` - Voucher creation DTO
- `dto/voucher-actions.dto.ts` - Disburse, settle, reject, link DTOs
- `vouchers.service.spec.ts` - Unit tests

## Architecture

### Voucher Lifecycle
```
REQUESTED → APPROVED → DISBURSED → PARTIALLY_SETTLED → SETTLED
     ↓           ↓                          ↓
  REJECTED   CANCELLED                   OVERDUE
```

### Settlement Flow
```
Disbursed Amount: 10,000 PKR
     ↓
Link Expenses (PETTY_CASH type)
     ↓
Calculate Totals:
  - totalExpensesAmount = sum of linked approved expenses
  - balance = disbursed - expenses
     ↓
If balance > 0: Require cashReturnConfirmed
If balance < 0: Require overspendJustification
     ↓
SETTLED
```

## Business Rules

1. **No Multiple Open Vouchers**: User cannot have vouchers in REQUESTED, APPROVED, DISBURSED, PARTIALLY_SETTLED, or OVERDUE status
2. **Maximum Amount**: 50,000 PKR limit
3. **Purpose Length**: Minimum 10 characters
4. **Disbursement**: Cannot exceed requested amount
5. **Settlement Deadline**: 7 business days from disbursement
6. **Expense Linking**: Only PETTY_CASH type expenses, only owner can link
7. **Overspend**: Requires justification when expenses > disbursed
8. **Underspend**: Requires cash return confirmation

## API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /vouchers | Create voucher request | All |
| GET | /vouchers | List vouchers (role-filtered) | All |
| GET | /vouchers/:id | Get voucher details | Owner, FINANCE, ADMIN |
| GET | /vouchers/pending-approval | Pending approvals | APPROVER, FINANCE, ADMIN |
| GET | /vouchers/outstanding | Outstanding vouchers | FINANCE, ADMIN |
| GET | /vouchers/overdue | Overdue vouchers | FINANCE, ADMIN |
| POST | /vouchers/:id/approve | Approve voucher | APPROVER, FINANCE, ADMIN |
| POST | /vouchers/:id/reject | Reject with reason | APPROVER, FINANCE, ADMIN |
| DELETE | /vouchers/:id | Cancel (before disburse) | Owner |
| POST | /vouchers/:id/disburse | Disburse funds | FINANCE, ADMIN |
| POST | /vouchers/:id/settle | Settle voucher | Owner, FINANCE, ADMIN |
| POST | /vouchers/:id/link-expense | Link expense | Owner |

## Key Methods

### `create(userId, dto)`
1. Validate no open vouchers for user
2. Validate amount (> 0, <= 50000)
3. Validate purpose length (>= 10)
4. Generate voucher number (PC-YYYY-XXXX)
5. Create with REQUESTED status

### `disburse(id, user, dto)`
1. Validate voucher is APPROVED
2. Validate disbursedAmount <= requestedAmount
3. Calculate settlement deadline (7 business days)
4. Update status to DISBURSED

### `settle(id, user, dto)`
1. Validate voucher is DISBURSED or PARTIALLY_SETTLED
2. Calculate totals from linked expenses
3. Handle overspend (require justification)
4. Handle underspend (require cash return confirmation)
5. Update status to SETTLED

### `linkExpense(voucherId, user, dto)`
1. Validate voucher status (DISBURSED, PARTIALLY_SETTLED, OVERDUE)
2. Validate expense ownership and type (PETTY_CASH)
3. Link expense to voucher
4. Update voucher totals automatically

## Dependencies
- `expenses` module - Expense entity (PETTY_CASH type)
- `approvals` module - Approval workflow (optional)
- Prisma model: Voucher

## Configuration
```bash
VOUCHER_NUMBER_PREFIX=PC
VOUCHER_SETTLEMENT_DAYS=7
VOUCHER_MAX_AMOUNT=50000
```

## Testing
```bash
# Unit tests
npm run test -w @tpl-expense/api -- vouchers.service

# E2E tests (requires database)
npm run test:e2e -w @tpl-expense/api -- vouchers.e2e-spec
```
