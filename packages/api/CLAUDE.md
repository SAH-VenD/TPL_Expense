# TPL Expense - API Package

**PHASE 1 COMPLETE** (2026-02-01) - All backend modules implemented

## Quick Reference
- **Framework**: NestJS 10 + TypeScript
- **Database**: PostgreSQL 15 via Prisma ORM
- **Auth**: JWT (RS256) with refresh tokens
- **Port**: 3000
- **Test Coverage**: 280+ unit tests, 100+ E2E tests

## Project Structure
```
packages/api/
├── prisma/           # Database schema & migrations
├── src/
│   ├── common/       # Shared utilities (PrismaService, guards, decorators)
│   ├── modules/      # Feature modules (see modules/CLAUDE.md)
│   └── main.ts       # App bootstrap
└── test/             # E2E tests
```

## Commands
```bash
# Development
npm run dev:api                    # Start with hot reload
npm run build -w @tpl-expense/api  # Build

# Database
npm run db:migrate -w @tpl-expense/api    # Run migrations
npm run db:seed -w @tpl-expense/api       # Seed data
npx prisma studio --schema packages/api/prisma/schema.prisma  # DB GUI

# Testing
npm run test -w @tpl-expense/api          # Unit tests
npm run test:e2e -w @tpl-expense/api      # E2E tests
```

## Module Creation Pattern
See `.claude/skills/api-module-template.md` for the standard pattern.

**Quick checklist for new module:**
1. Create folder: `src/modules/{name}/`
2. Create files: module, controller, service, DTOs
3. Register in `app.module.ts`
4. Add Swagger decorators

## Key Patterns

### Authentication
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
```

### Current User
```typescript
@CurrentUser() user: User
```

### Standard Response
```typescript
return {
  data: items,
  meta: { pagination: { page, pageSize, total, totalPages } }
};
```

## Environment Variables
See `.env.example` for required variables. Key ones:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `AWS_ENDPOINT` - LocalStack URL for dev

## Implemented Modules
| Module | Status | Tests | Notes |
|--------|--------|-------|-------|
| auth | Complete | Unit | JWT login/register/refresh/change-password/reset |
| users | Complete | Unit | CRUD + role-based access |
| categories | Complete | Unit | Hierarchical CRUD (tree) |
| departments | Complete | Unit | Hierarchical CRUD (tree) |
| storage | Complete | Unit | S3/LocalStorage providers |
| expenses | Complete | Unit | Expense CRUD with splits |
| receipts | Complete | Unit | File uploads, OCR processing endpoints |
| approvals | Complete | 35 unit, 31 E2E | Multi-tier workflow, delegation, emergency approvals |
| vouchers | Complete | 114 unit, 24 E2E | Petty cash lifecycle |
| budgets | Complete | 85 unit | Utilization, enforcement |
| reports | Complete | 52 unit, 70+ E2E | Analytics, dashboards, XLSX/CSV/PDF exports |
| pre-approvals | Complete | - | Pre-approval workflow with travel details |

## RBAC Role Hierarchy
- **EMPLOYEE** - Basic expense submission
- **APPROVER** - Department-scoped approvals
- **SUPER_APPROVER** - Cross-department approver, org-wide visibility, emergency approvals
- **FINANCE** - Org-wide visibility, budget management, high-value approvals
- **CEO** - Highest tier approver, emergency approvals without justification
- **ADMIN** - System administration, NO approval rights (separation of duties)

Role constants defined in `src/common/constants/roles.ts`.
