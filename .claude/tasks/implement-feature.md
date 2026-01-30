# Task: Implement Feature

## Overview
Systematic approach to implementing a new feature from start to finish.

---

## Phase 1: Planning

### 1.1 Understand Requirements
- [ ] Read the feature requirements/ticket
- [ ] Identify acceptance criteria
- [ ] Get clarification if needed

### 1.2 Check for Relevant Skills
```bash
ls .claude/skills/
cat .claude/skills/[relevant-skill].md
```

### 1.3 Design Approach
- [ ] Identify affected modules
- [ ] Plan Prisma schema changes
- [ ] Plan API endpoints
- [ ] Plan UI components (if frontend)

---

## Phase 2: Backend Implementation

### 2.1 Database Layer
```bash
# Update Prisma schema
# packages/api/prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name add_[entity]_table --schema packages/api/prisma/schema.prisma

# Generate client
npx prisma generate --schema packages/api/prisma/schema.prisma
```

### 2.2 Service Layer
```bash
# Create service
touch packages/api/src/modules/[module]/[module].service.ts
touch packages/api/src/modules/[module]/[module].service.spec.ts
```

**Service Checklist:**
- [ ] Constructor with injected PrismaService
- [ ] CRUD methods implemented
- [ ] Business logic encapsulated
- [ ] Proper error handling
- [ ] Unit tests written (80%+ coverage)

### 2.3 Controller Layer
```bash
touch packages/api/src/modules/[module]/[module].controller.ts
touch packages/api/src/modules/[module]/dto/[action].dto.ts
```

### 2.4 Module Registration
```typescript
// [module].module.ts
@Module({
  imports: [PrismaModule],
  controllers: [Controller],
  providers: [Service],
  exports: [Service],
})
export class Module {}
```

---

## Phase 3: Frontend Implementation

### 3.1 RTK Query Integration
```bash
touch packages/web/src/services/[module]Api.ts
```

### 3.2 Components
```bash
mkdir packages/web/src/components/[module]
touch packages/web/src/components/[module]/[Component].tsx
```

### 3.3 Pages/Routes
```bash
touch packages/web/src/pages/[module]/index.tsx
```

---

## Phase 4: Testing

```bash
# Backend tests
npm run test -w @tpl-expense/api -- packages/api/src/modules/[module]

# Frontend tests
npm run test -w @tpl-expense/web

# Check coverage
npm run test -w @tpl-expense/api -- --coverage
```

---

## Phase 5: Documentation

- [ ] Update root CLAUDE.md - feature status
- [ ] Update CHANGELOG
- [ ] Swagger decorators complete

---

## Phase 6: Review & Cleanup

```bash
./scripts/pre-push.sh
```

---

## Quick Reference Commands

```bash
# Start feature branch
git checkout -b feature/[name]

# Run tests
npm run test -w @tpl-expense/api

# Build check
npm run build -w @tpl-expense/api

# Create PR
gh pr create --title "feat: [description]"
```
