# TPL Expense - API Package

## Quick Reference
- **Framework**: NestJS 10 + TypeScript
- **Database**: PostgreSQL 15 via Prisma ORM
- **Auth**: JWT (RS256) with refresh tokens
- **Port**: 3000

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
| Module | Status | Notes |
|--------|--------|-------|
| auth | Complete | JWT login/register/refresh |
| users | Complete | CRUD + approval workflow |
| categories | Complete | Hierarchical CRUD |
| departments | Complete | Hierarchical CRUD |
| expenses | Placeholder | Day 3 |
| receipts | Placeholder | Day 3 |
| approvals | Placeholder | Day 4 |
| vouchers | Placeholder | Day 5 |
