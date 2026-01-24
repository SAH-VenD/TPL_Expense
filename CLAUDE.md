# TPL Expense - Project Context & Learnings

## Project Overview
Expense & Receipt Automation System for Tekcellent (40 employees)
- **Timeline**: 1 week (Phase 1 & 2)
- **Requirements Doc**: `/Users/saadhashmi/Downloads/EXPENSE_AUTOMATION_REQUIREMENTS.md`

## Technology Stack
| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22 LTS |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | NestJS 10 + TypeScript |
| Database | PostgreSQL 15 + Prisma ORM |
| State Management | Redux Toolkit + RTK Query |
| File Storage | AWS S3 (LocalStack for dev) |
| OCR | AWS Textract (with abstraction layer) |
| Queue | Bull (Redis-backed) |
| Auth | JWT (RS256) + Refresh Tokens |
| Email | Nodemailer (MailHog for dev) |

## Project Structure
```
tpl-expense/
├── packages/
│   ├── api/          # NestJS Backend (port 3000)
│   ├── web/          # React Frontend (port 5173)
│   └── shared/       # Shared types & constants
├── docker/           # Docker configs
└── scripts/          # Utility scripts
```

## Implementation Progress

### Day 1 - COMPLETED
- [x] Monorepo with npm workspaces
- [x] TypeScript, ESLint, Prettier configuration
- [x] Docker Compose (PostgreSQL, Redis, LocalStack, MailHog)
- [x] NestJS API structure with Prisma
- [x] Complete Prisma schema with all entities
- [x] React app with Vite + Tailwind
- [x] Authentication module with JWT (complete with guards, strategies, decorators)
- [x] Users module with CRUD, approval workflow, bulk import
- [x] RTK Query services for all features (auth, expenses, approvals, vouchers, budgets, reports, admin)
- [x] MainLayout and AuthLayout components
- [x] Protected routes and role-based routes
- [ ] Remaining NestJS module placeholders (IN PROGRESS)
- [ ] Frontend page components

### Day 2 - TODO
- [ ] Category & Department modules (full implementation)
- [ ] Frontend auth pages (LoginForm, RegisterForm)
- [ ] Storage module (S3)
- [ ] Receipt upload

### Day 3 - TODO
- [ ] S3 storage module
- [ ] Receipt upload
- [ ] Expense module
- [ ] Frontend expense form

### Day 4 - TODO
- [ ] Single-tier approval
- [ ] Email notifications
- [ ] Dashboards
- [ ] **Phase 1 Complete**

### Day 5 - TODO
- [ ] OCR with Textract
- [ ] Voucher module

### Day 6 - TODO
- [ ] Multi-tier approval
- [ ] Budgets
- [ ] Pre-approvals

### Day 7 - TODO
- [ ] Reports
- [ ] Admin panel
- [ ] **Phase 2 Complete**

## Key Files Created

### Configuration
- `/package.json` - Workspace root
- `/docker-compose.yml` - Local dev services
- `/.gitignore`, `/.prettierrc`, `/.nvmrc`

### API Package
- `/packages/api/package.json` - Dependencies
- `/packages/api/tsconfig.json` - TypeScript config
- `/packages/api/nest-cli.json` - NestJS CLI config
- `/packages/api/.eslintrc.js` - Linting
- `/packages/api/.env.example` - Environment template
- `/packages/api/src/main.ts` - App bootstrap
- `/packages/api/src/app.module.ts` - Root module
- `/packages/api/src/common/prisma/` - Prisma service
- `/packages/api/prisma/schema.prisma` - Complete DB schema

### Docker
- `/docker/Dockerfile.api` - API container
- `/docker/Dockerfile.web` - Web container
- `/docker/nginx.conf` - Nginx for production
- `/scripts/localstack-init.sh` - S3 bucket setup

## Database Schema Summary

### Core Entities
- **User**: Authentication, roles, organizational hierarchy
- **Department**: Organizational units with hierarchy
- **Project**: Client projects for expense allocation
- **CostCenter**: Cost tracking units

### Expense Entities
- **Expense**: Main expense records
- **ExpenseSplit**: Split expenses across categories
- **Receipt**: Uploaded receipt files with OCR data
- **Attachment**: Additional expense attachments
- **Category**: Expense categories with hierarchy
- **Vendor**: Vendor database with auto-learning

### Workflow Entities
- **Voucher**: Petty cash voucher lifecycle
- **ApprovalTier**: Configurable approval levels
- **ApprovalHistory**: Approval audit trail
- **ApprovalDelegation**: Approval delegation
- **PreApproval**: Pre-approval requests

### System Entities
- **Budget**: Budget tracking & enforcement
- **Comment**: Threaded comments with mentions
- **Notification**: User notifications
- **AuditLog**: Complete audit trail
- **ExchangeRate**: Currency exchange rates
- **MileageRate**: Mileage reimbursement rates
- **PerDiemRate**: Per diem allowances
- **SystemSetting**: Configurable settings
- **SequenceCounter**: Auto-numbering

## Key Enums
- **UserStatus**: PENDING_APPROVAL, ACTIVE, INACTIVE, LOCKED
- **RoleType**: EMPLOYEE, APPROVER, FINANCE, ADMIN
- **ExpenseStatus**: DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, CLARIFICATION_REQUESTED, RESUBMITTED, PAID
- **VoucherStatus**: REQUESTED, APPROVED, REJECTED, DISBURSED, PARTIALLY_SETTLED, SETTLED, OVERDUE
- **Currency**: PKR, GBP, USD, SAR, AED
- **TaxType**: Pakistan provincial taxes + international VAT
- **BudgetEnforcement**: HARD_BLOCK, SOFT_WARNING, AUTO_ESCALATE

## Security Requirements
- AES-256 encryption at rest
- TLS 1.3 in transit
- bcrypt password hashing (cost factor 12)
- JWT with RS256 (asymmetric)
- Rate limiting: 5 failures = 15 min lockout
- 5-minute session inactivity timeout
- Password: 8+ chars, upper, lower, number, special
- Password rotation: 90 days
- Password history: last 5 passwords
- Single session per user

## API Endpoints Structure
```
/api/v1/auth/*          # Authentication
/api/v1/users/*         # User management
/api/v1/expenses/*      # Expense CRUD
/api/v1/receipts/*      # Receipt upload/OCR
/api/v1/approvals/*     # Approval workflow
/api/v1/vouchers/*      # Petty cash vouchers
/api/v1/budgets/*       # Budget management
/api/v1/pre-approvals/* # Pre-approval workflow
/api/v1/reports/*       # Reporting
/api/v1/admin/*         # Admin configuration
```

## Important Business Rules

### Expense Submission
- 10 business day deadline from expense date
- Out-of-Pocket: Employee seeks reimbursement
- Petty Cash: Employee reconciles company cash

### Approval Tiers (Example)
| Tier | Amount (PKR) | Approver |
|------|--------------|----------|
| 1 | 0 - 25,000 | Reporting Manager |
| 2 | 25,001 - 100,000 | Department Head |
| 3 | 100,001 - 250,000 | Finance Manager |
| 4 | 250,001+ | CFO/CEO |

### Budget Enforcement
- HARD_BLOCK: Cannot submit when exceeded
- SOFT_WARNING: Can submit but flagged
- AUTO_ESCALATE: Requires senior approval

### Pre-Approval Required For
- Travel (flights, hotels, car rentals)
- Client Entertainment
- Conference/Training Registrations
- Purchases above threshold (e.g., PKR 50,000)

### Voucher Settlement Rules
- Receipts < Advance: Return unspent cash
- Receipts = Advance: Clean settlement
- Receipts > Advance: Escalation for overspend approval

## Commands Reference

```bash
# Start development services
docker-compose up -d

# Install dependencies
npm install

# Run API development
npm run dev:api

# Run Web development
npm run dev:web

# Database migrations
npm run db:migrate -w @tpl-expense/api

# Database seeding
npm run db:seed -w @tpl-expense/api

# Run tests
npm run test -w @tpl-expense/api
```

## Ports
- API: 3000
- Web: 5173
- PostgreSQL: 5432
- Redis: 6379
- LocalStack: 4566
- MailHog SMTP: 1025
- MailHog UI: 8025

## Environment Variables (Key Ones)
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_HOST/PORT` - Redis connection
- `JWT_ACCESS_SECRET/REFRESH_SECRET` - JWT secrets
- `AWS_ENDPOINT` - LocalStack URL for dev
- `S3_BUCKET_NAME` - Receipt storage bucket
- `ALLOWED_EMAIL_DOMAIN` - tekcellent.com
- `FRONTEND_URL` - CORS origin

## Next Steps (Current Session)
1. ~~Create remaining module placeholders~~ (IN PROGRESS)
2. ~~Implement auth module~~ (DONE)
3. ~~Set up React frontend~~ (DONE)
4. Create remaining NestJS modules
5. Create frontend page components
6. Create database seed script

## Git Branching Strategy
- **main**: Production-ready code
- **feature/***: Feature branches (current: feature/day1-auth-setup)
- Commit frequently, push after each logical feature completion
- Create PR to merge back to main

## Learnings & Decisions
1. Using NestJS over Express for better structure and TypeScript support
2. Using Prisma ORM for type-safe database access
3. Using LocalStack for local AWS development (no costs)
4. Using MailHog for email testing
5. Monorepo with npm workspaces for shared code
6. Redux Toolkit + RTK Query for frontend state management
7. Node.js 22 LTS as required by user
8. Simple git branching: main + feature branches
9. Commit after each logical feature completion with descriptive messages

## Completed Modules

### Auth Module (`/packages/api/src/modules/auth/`)
- `auth.module.ts` - Module definition
- `auth.controller.ts` - REST endpoints
- `auth.service.ts` - Business logic (login, register, JWT, etc.)
- `strategies/jwt.strategy.ts` - JWT validation
- `guards/jwt-auth.guard.ts` - Route protection
- `guards/roles.guard.ts` - Role-based access
- `decorators/` - CurrentUser, Public, Roles

### Users Module (`/packages/api/src/modules/users/`)
- Full CRUD with pagination
- Admin approval workflow
- Bulk import capability
- Role-based access control
