# Skills Directory

This directory contains domain-specific knowledge and implementation patterns for the TPL Expense system. Each skill file documents business rules, data models, and code patterns for a specific domain area.

## When to Read Skills

**Read the relevant skill BEFORE implementing any feature in that domain.** Skills contain critical business logic that must be followed.

## Skills Index

### Core Domain Skills

| Skill | Purpose | Key Contents |
|-------|---------|--------------|
| [expense-domain.md](expense-domain.md) | Expense business rules | Lifecycle states, validation rules, duplicate detection, currency handling |
| [approval-workflow.md](approval-workflow.md) | Multi-tier approval system | Tier configuration, delegation, escalation, bulk approval |
| [voucher-management.md](voucher-management.md) | Petty cash vouchers | Request → Disburse → Settle flow, overspend/underspend handling |
| [budget-tracking.md](budget-tracking.md) | Budget management | Utilization calculations, enforcement levels, threshold alerts |

### Integration Skills

| Skill | Purpose | Key Contents |
|-------|---------|--------------|
| [ocr-integration.md](ocr-integration.md) | Receipt scanning | AWS Textract, Tesseract fallback, data extraction patterns |
| [notification-patterns.md](notification-patterns.md) | Notifications | Email/in-app delivery, templates, user preferences, WebSocket |
| [pre-approval-workflow.md](pre-approval-workflow.md) | Pre-approval system | Rules engine, automation flows |

### Implementation Patterns

| Skill | Purpose | Key Contents |
|-------|---------|--------------|
| [testing-patterns.md](testing-patterns.md) | Test conventions | Unit/E2E patterns, factories, coverage requirements |
| [prisma-patterns.md](prisma-patterns.md) | Database patterns | Prisma best practices, relations, soft delete |
| [auth-implementation.md](auth-implementation.md) | Authentication | JWT flow, guards, refresh tokens |

### Templates & Conventions

| Skill | Purpose | Key Contents |
|-------|---------|--------------|
| [api-module-template.md](api-module-template.md) | Backend module structure | NestJS module scaffolding |
| [react-feature-template.md](react-feature-template.md) | Frontend feature structure | RTK Query services, component patterns |
| [expense-workflow.md](expense-workflow.md) | End-to-end expense flow | Complete submission → approval → settlement |
| [git-branching.md](git-branching.md) | Git conventions | Branch naming, commit messages |
| [docker-conventions.md](docker-conventions.md) | Docker setup | Compose configuration, LocalStack |

## Quick Reference by Task

### "I need to implement expense features"
1. Read `expense-domain.md` - business rules and data models
2. Read `expense-workflow.md` - end-to-end flow
3. Read `approval-workflow.md` - if touching approvals

### "I need to implement approval features"
1. Read `approval-workflow.md` - tier system, delegation
2. Read `notification-patterns.md` - approval notifications

### "I need to implement voucher features"
1. Read `voucher-management.md` - full lifecycle
2. Read `expense-domain.md` - linked expenses

### "I need to implement budget features"
1. Read `budget-tracking.md` - utilization, enforcement
2. Read `expense-domain.md` - budget assignment

### "I need to add OCR/receipt scanning"
1. Read `ocr-integration.md` - providers, extraction
2. Read `expense-domain.md` - receipt entity

### "I need to write tests"
1. Read `testing-patterns.md` - patterns and conventions
2. Read domain skill for the feature being tested

### "I need to add notifications"
1. Read `notification-patterns.md` - templates, channels
2. Read domain skill for notification triggers

## Key Business Rules Summary

### Expense Status Flow
```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → SETTLED
                  ↓                   ↓
              REJECTED          CLARIFICATION_REQUESTED
                  ↓                   ↓
              RESUBMITTED ←←←←←←←←←←←←
```

### Voucher Status Flow
```
REQUESTED → APPROVED → DISBURSED → SETTLED
    ↓           ↓          ↓
 REJECTED   CANCELLED   OVERDUE
```

### Approval Tier Example
| Tier | Amount Range | Approver |
|------|--------------|----------|
| 1 | 0 - 25,000 PKR | Reporting Manager |
| 2 | 25,001 - 100,000 PKR | Department Head |
| 3 | 100,001 - 250,000 PKR | Finance Manager |
| 4 | 250,001+ PKR | CFO/CEO |

### Supported Currencies
`PKR`, `USD`, `GBP`, `SAR`, `AED`

### Budget Enforcement Levels
- **HARD_BLOCK**: Prevent submission when exceeded
- **SOFT_WARNING**: Allow with warning flag
- **ESCALATE**: Require higher approval tier
- **NONE**: Track only

## File Naming Convention

```
{domain}.md              - Core domain rules (expense-domain.md)
{domain}-workflow.md     - End-to-end flows (approval-workflow.md)
{technology}-patterns.md - Tech-specific patterns (prisma-patterns.md)
{feature}-integration.md - Integration guides (ocr-integration.md)
{feature}-template.md    - Scaffolding templates (api-module-template.md)
```

---

**Last Updated:** 2026-02-07
