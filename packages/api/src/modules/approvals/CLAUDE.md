# Approvals Module

## Overview
Multi-tier expense approval workflow with delegation support, history tracking, and resubmission capabilities.

## Status: COMPLETE
- Completed: 2026-01-30
- Tests: 35 unit tests, 31 E2E tests
- QA Update: 2026-02-02 (API connections, delegate modal fixes)

## Key Files
- `approvals.service.ts` - Core approval logic with tier-based workflow
- `approvals.controller.ts` - REST endpoints for approval actions
- `dto/approval.dto.ts` - Approve, reject, clarify, bulk approve DTOs
- `dto/delegation.dto.ts` - Delegation create/revoke DTOs
- `approvals.service.spec.ts` - Unit tests

## Architecture

### Approval Flow
```
SUBMITTED → PENDING_APPROVAL → APPROVED
     ↓              ↓
  REJECTED   CLARIFICATION_REQUESTED
                    ↓
               RESUBMITTED → SUBMITTED
```

### Multi-Tier System
- Tiers defined by amount thresholds and approver roles
- Sequential approval through tiers based on `amountInPKR`
- Each tier maps to a role: APPROVER, FINANCE, ADMIN

### Delegation
- Time-bound delegation (start/end dates)
- Overlap validation prevents conflicts
- Delegation tracked in approval history

## Business Rules

1. **Tier Assignment**: Expenses matched to tiers by `minAmount`/`maxAmount`
2. **Authorization**: User role must match tier's `approverRole`, OR have active delegation
3. **Status Validation**: Only SUBMITTED or PENDING_APPROVAL expenses can be approved
4. **Rejection Reason**: Required for all rejections
5. **Clarification Question**: Required when requesting clarification
6. **Resubmission**: Only owner can resubmit REJECTED or CLARIFICATION_REQUESTED expenses

## API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /approvals/pending | Pending approvals for user | APPROVER, FINANCE, ADMIN |
| GET | /approvals/history | User's approval history | APPROVER, FINANCE, ADMIN |
| GET | /approvals/expenses/:id/history | Expense approval timeline | All |
| POST | /approvals/approve | Approve expense | APPROVER, FINANCE, ADMIN |
| POST | /approvals/approve/bulk | Bulk approve | APPROVER, FINANCE, ADMIN |
| POST | /approvals/reject | Reject expense | APPROVER, FINANCE, ADMIN |
| POST | /approvals/clarify | Request clarification | APPROVER, FINANCE, ADMIN |
| GET | /approvals/delegations | Active delegations | APPROVER, FINANCE, ADMIN |
| POST | /approvals/delegations | Create delegation | APPROVER, FINANCE, ADMIN |
| POST | /approvals/delegations/revoke | Revoke delegation | APPROVER, FINANCE, ADMIN |
| GET | /approvals/tiers | Get approval tiers | ADMIN, FINANCE |

## Key Methods

### `approve(user, dto)`
1. Validate expense status (SUBMITTED/PENDING_APPROVAL)
2. Get required tier based on amount
3. Check user authorization (role or delegation)
4. Record approval in history
5. Determine if more tiers needed → PENDING_APPROVAL or APPROVED

### `checkApprovalAuthority(userId, expense, requiredTier)`
1. Check if user role matches tier's approverRole
2. If not, check for active delegation from someone with the role
3. Return authorization status and delegation info

### `getRequiredApprovalTier(expense)`
1. Get expense amount in PKR
2. Find approved tiers from history
3. Return next tier not yet approved

## Dependencies
- `expenses` module - Expense entity
- `users` module - User roles and managers
- Prisma models: ApprovalTier, ApprovalHistory, ApprovalDelegation

## Testing
```bash
# Unit tests
npm run test -w @tpl-expense/api -- approvals.service

# E2E tests (requires database)
npm run test:e2e -w @tpl-expense/api -- approvals.e2e-spec
```
