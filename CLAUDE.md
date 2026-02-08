# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TPL Expense** is an Expense & Receipt Automation System built as a monorepo with separate backend API and frontend web packages. The system handles expense tracking, receipt OCR, approval workflows, petty cash vouchers, and budget management.

**Tech Stack:**
- Backend: NestJS 10 + TypeScript + Prisma ORM + PostgreSQL
- Frontend: React 18 + TypeScript + Vite + Redux Toolkit + Tailwind CSS
- Infrastructure: Docker Compose (Postgres, Redis, LocalStack S3/Textract, MailHog)

## Current Status (as of 2026-02-08)

### Phase 1: Backend Implementation - COMPLETE
All 12 backend modules implemented with comprehensive test coverage:
- **Total:** 280+ unit tests, 100+ E2E tests
- **Modules:** auth, users, categories, departments, storage, expenses, receipts, approvals, vouchers, budgets, reports, pre-approvals

### Phase 2: Frontend Implementation - COMPLETE
| Epic | Name | Status |
|------|------|--------|
| 1 | UI Component Library | Complete |
| 2 | Dashboard | Complete (role-based widget visibility) |
| 3 | Expense Management | Complete (4 pages + OCR integration) |
| 4 | Approval Workflow | Complete (emergency approvals, SUPER_APPROVER) |
| 5 | Voucher Management | Complete (3 pages) |
| 6 | Budget Management | Complete (3 pages + tests) |
| 7 | Reports & Analytics | Complete (6 report types + XLSX/CSV export) |
| 8 | Administration | Complete (4 pages, connected to APIs) |
| 9 | OCR & Receipt Processing | Complete (camera capture, auto-populate) |
| 10 | Pre-Approval Workflow | Complete (3 pages + travel details) |
| 11 | Notifications & Alerts | Complete |

### RBAC Overhaul - COMPLETE
- **6 roles:** EMPLOYEE, APPROVER, SUPER_APPROVER, FINANCE, CEO, ADMIN
- **SUPER_APPROVER:** Cross-department approver with org-wide visibility and emergency approvals
- **CEO:** Highest tier approver, emergency approvals without justification
- **ADMIN:** System administration with read-only access to approvals (separation of duties)
- **Emergency Approvals:** UI with justification requirement (min 20 chars, waived for CEO)
- **Role constants:** Consistent frontend/backend role groups (APPROVING_ROLES, APPROVAL_READ_ROLES, EMERGENCY_APPROVAL_ROLES, etc.)

### QA/Polish - COMPLETE
- All admin pages connected to real APIs (Categories, Audit Logs, Settings)
- Report exports working (XLSX/CSV blob downloads)
- ESLint configured for web package
- 150+ E2E tests across 11 Playwright spec files
- Profile page with password change

## Repository Structure

```
TPL_Expense/
├── packages/
│   ├── api/              # NestJS backend (port 3000)
│   │   ├── prisma/       # Database schema & migrations
│   │   ├── src/
│   │   │   ├── common/   # Shared utilities (PrismaService, guards, decorators)
│   │   │   ├── modules/  # Feature modules (auth, users, expenses, etc.)
│   │   │   └── main.ts   # App bootstrap with Swagger
│   │   └── test/         # E2E tests
│   ├── web/              # React frontend (port 5173)
│   │   └── src/
│   │       ├── components/ # Reusable UI components
│   │       ├── features/   # Feature-specific components with RTK Query slices
│   │       ├── pages/      # Route pages
│   │       ├── services/   # API base query with auth revalidation
│   │       └── store/      # Redux store configuration
│   └── shared/           # Shared types/utilities (if needed)
├── docker/               # Dockerfiles
├── docker-compose.yml    # Local development services
└── scripts/              # Utility scripts
```

**Note:** Each package has its own `CLAUDE.md` with package-specific details. See:
- `packages/api/CLAUDE.md` - Backend API patterns and commands
- `packages/api/src/modules/CLAUDE.md` - Module creation patterns
- `packages/api/prisma/CLAUDE.md` - Database schema and Prisma commands
- `packages/web/CLAUDE.md` - Frontend patterns and services

---

## Project Resources

### Skills (Read before implementing related features)
| Skill | When to Read |
|-------|--------------|
| `.claude/skills/expense-domain.md` | Before any expense-related work |
| `.claude/skills/approval-workflow.md` | Before implementing approvals, delegation, escalation |
| `.claude/skills/voucher-management.md` | Before petty cash/voucher work |
| `.claude/skills/budget-tracking.md` | Before budget features |
| `.claude/skills/ocr-integration.md` | Before receipt scanning work |
| `.claude/skills/pre-approval-workflow.md` | Before pre-approval features |
| `.claude/skills/notification-patterns.md` | Before email/in-app notifications |
| `.claude/skills/testing-patterns.md` | Before writing tests |
| `.claude/skills/docker-conventions.md` | Before Docker/deployment work |

### Hooks (Follow at trigger points)
| Hook | When to Follow |
|------|----------------|
| `.claude/hooks/session-start.md` | **Beginning of every session** |
| `.claude/hooks/session-end.md` | Before ending a session |
| `.claude/hooks/pre-commit.md` | Before every git commit |
| `.claude/hooks/pre-push.md` | Before pushing to remote |
| `.claude/hooks/post-feature.md` | After completing a feature |
| `.claude/hooks/self-review.md` | Before creating a PR |
| `.claude/hooks/on-error.md` | When errors occur |

### Tasks (Step-by-step guides)
| Task | When to Use |
|------|-------------|
| `.claude/tasks/implement-feature.md` | Building new features end-to-end |
| `.claude/tasks/fix-bug.md` | Diagnosing and fixing bugs |
| `.claude/tasks/add-endpoint.md` | Adding new API endpoints |
| `.claude/tasks/refactor.md` | Refactoring existing code |
| `.claude/tasks/db-migration.md` | Database schema changes |

### Agents (For complex multi-part features)
| Agent | Responsibility |
|-------|----------------|
| `.claude/agents/orchestrator.md` | Coordinates multi-agent workflows |
| `.claude/agents/backend-engineer.md` | Entities, services, controllers, unit tests |
| `.claude/agents/frontend-engineer.md` | Components, hooks, pages |
| `.claude/agents/qa-engineer.md` | Integration and E2E tests |
| `.claude/agents/code-reviewer.md` | Quality gate checklist |
| `.claude/agents/devops-engineer.md` | Docker, CI/CD, infrastructure |
| `.claude/agents/documentation.md` | API docs, README, changelog |
| `.claude/agents/dependencies.md` | Agent dependency graph |

### State Files
- `.claude/state/project-state.json` - Overall project tracking
- `.claude/state/current-feature.json` - Active feature state (copy from template)
- `.claude/state/session-notes.md` - Session handoff notes (copy from template)

### Other References
- `.claude/COMMANDS.md` - Full command reference
- `.claude/settings.json` - Project configuration

---

## Mandatory Workflows

1. **Session Start**: Always read `.claude/hooks/session-start.md` first
2. **Before Implementing**: Read the relevant skill file for that domain
3. **Before Committing**: Follow `.claude/hooks/pre-commit.md` checklist
4. **On Errors**: Follow `.claude/hooks/on-error.md` diagnosis workflow
5. **Session End**: Follow `.claude/hooks/session-end.md` to preserve context

## Development Commands

### Quick Start
```bash
# Start infrastructure (Postgres, Redis, LocalStack, MailHog)
docker-compose up -d

# Start backend (in one terminal)
npm run dev:api

# Start frontend (in another terminal)
npm run dev:web

# Or start both together
npm run dev
```

### Database Operations
```bash
# Run migrations
npm run db:migrate -w @tpl-expense/api

# Seed database
npm run db:seed -w @tpl-expense/api

# Open Prisma Studio (GUI)
npx prisma studio --schema packages/api/prisma/schema.prisma

# Generate Prisma client after schema changes
npx prisma generate --schema packages/api/prisma/schema.prisma
```

### Testing
```bash
# Backend unit tests
npm run test -w @tpl-expense/api

# Run specific test file
npm run test -w @tpl-expense/api -- auth.service

# Watch mode
npm run test -w @tpl-expense/api -- --watch

# E2E tests
npm run test:e2e -w @tpl-expense/api

# Frontend tests
npm run test -w @tpl-expense/web
```

### Code Quality
```bash
# Lint all packages
npm run lint

# Format all code
npm run format
```

### Building
```bash
# Build backend
npm run build:api

# Build frontend
npm run build:web

# Build everything
npm run build
```

## Architecture Patterns

### Backend (NestJS)

#### Authentication & Authorization
- JWT-based auth with access tokens (15m) and refresh tokens (7d)
- Role-based access control via `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(RoleType.ADMIN)`
- Get current user with `@CurrentUser() user: User` decorator
- Public routes use `@Public()` decorator

#### Module Structure
All feature modules follow this pattern:
```
{module}/
├── {module}.module.ts
├── {module}.controller.ts
├── {module}.service.ts
└── dto/
    ├── create-{entity}.dto.ts
    └── update-{entity}.dto.ts
```

#### Standard Response Format
```typescript
{
  data: items,
  meta: {
    pagination: { page, pageSize, total, totalPages }
  }
}
```

#### Prisma Patterns
- Use `PrismaService` injection for database access
- Soft delete with `isActive: boolean` flag
- Money amounts use `Decimal @db.Decimal(15, 2)`
- Hierarchical data (Categories, Departments) use self-referential relations

### Frontend (React)

#### State Management
- Redux Toolkit for auth state
- RTK Query for API calls with automatic caching and revalidation
- All API services in `src/features/{feature}/services/`

#### Base Query with Auto-Reauth
The `baseQueryWithReauth` in `src/services/api.ts` automatically refreshes tokens on 401 responses.

#### Component Organization
- `src/components/` - Shared UI components
- `src/features/` - Feature-specific components with their own services and state
- `src/pages/` - Route-level page components

#### API Service Pattern
```typescript
export const expensesApi = createApi({
  reducerPath: 'expensesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Expense'],
  endpoints: (builder) => ({
    getExpenses: builder.query({ ... }),
    createExpense: builder.mutation({ ... }),
  }),
});
```

## Key Configuration

### Environment Variables
Backend (`.env` in `packages/api/`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` - JWT signing keys
- `AWS_ENDPOINT` - LocalStack URL (http://localhost:4566 for dev)
- `FRONTEND_URL` - CORS configuration (http://localhost:5173 for dev)

Frontend (`.env` in `packages/web/`):
- `VITE_API_URL` - Backend API URL (http://localhost:3000/api/v1)

See `.env.example` files in each package for complete reference.

### API Versioning
The API uses URI versioning with prefix `/api/v1/`. This is configured in `packages/api/src/main.ts`.

### Swagger Documentation
Available at `http://localhost:3000/api/docs` when backend is running.

## Database Schema

The Prisma schema defines these core entity groups:

**Core Entities:** User, Department, Category, Project, CostCenter
**Expense Entities:** Expense, ExpenseSplit, Receipt, Attachment, Vendor
**Workflow Entities:** Voucher, ApprovalTier, ApprovalHistory, ApprovalDelegation, PreApproval
**System Entities:** Budget, Notification, AuditLog, SystemSetting

**Key Enums:**
- `UserStatus`: PENDING_APPROVAL, ACTIVE, INACTIVE, LOCKED
- `RoleType`: EMPLOYEE, APPROVER, SUPER_APPROVER, FINANCE, CEO, ADMIN
- `ExpenseStatus`: DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, CLARIFICATION_REQUESTED, RESUBMITTED, PAID
- `Currency`: PKR, GBP, USD, SAR, AED

## Infrastructure Services

### Docker Compose Services
- **postgres** (port 5432) - PostgreSQL 15
- **redis** (port 6379) - Redis 7 for caching/queues
- **localstack** (port 4566) - AWS S3 & Textract emulation
- **mailhog** (ports 1025/8025) - SMTP testing & email UI

Start with: `docker-compose up -d`
Stop with: `docker-compose down`

## Testing Strategy

### Backend Tests
- Unit tests use Jest with `@nestjs/testing`
- E2E tests in `packages/api/test/` with supertest
- Test database setup in `test/test-utils.ts`

### Frontend Tests
- Unit/integration tests use Vitest + React Testing Library
- Configuration in `vitest.config.ts`

## Code Style

- Prettier config in `.prettierrc` (single quotes, 100 char width, 2 space indent)
- ESLint for both TypeScript packages
- Run `npm run format` before committing

## Common Workflows

### Adding a New API Module
1. Create folder: `packages/api/src/modules/{name}/`
2. Create module, controller, service, and DTOs
3. Register in `packages/api/src/app.module.ts`
4. Add Swagger decorators with `@ApiTags()` and `@ApiBearerAuth('JWT-auth')`
5. Write unit tests

### Adding Database Fields
1. Update `packages/api/prisma/schema.prisma`
2. Run `npx prisma generate --schema packages/api/prisma/schema.prisma`
3. Run `npx prisma migrate dev --name {description} --schema packages/api/prisma/schema.prisma`
4. Update DTOs and service logic

### Adding Frontend Features
1. Create feature folder in `src/features/{feature}/`
2. Create RTK Query service in `services/`
3. Add service to store in `src/store/index.ts`
4. Create page components in `src/pages/`
5. Add routes in `src/router/`

## Important Notes

- Node version: >=22.0.0 (see `.nvmrc`)
- This is a monorepo using npm workspaces
- Use workspace commands: `-w @tpl-expense/api` or `-w @tpl-expense/web`
- Backend uses NestJS's dependency injection - services are injectable
- Frontend uses RTK Query for server state, Redux for client state
- All API endpoints require authentication except those marked `@Public()`
- Prisma Client must be regenerated after schema changes
