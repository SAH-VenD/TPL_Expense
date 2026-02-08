# Tasks Folder - Context Management Guide

This folder contains task planning documents for the TPL Expense project. This CLAUDE.md helps Claude efficiently manage context when working on implementation tasks.

---

## Quick Reference

### Current Active Work
- **Phase 2**: Frontend Implementation - COMPLETE
- **Master Plan**: [phase2-overview.md](./phase2-overview.md)

### Epic Status & WBS Files

| Epic | Priority | Status | WBS File |
|------|----------|--------|----------|
| 1. UI Components | P0 | Complete | [epic-01-ui-components.md](./epic-01-ui-components.md) |
| 2. Dashboard | P1 | Complete | [epic-02-dashboard.md](./epic-02-dashboard.md) |
| 3. Expenses | P1 | Complete | [epic-03-expenses.md](./epic-03-expenses.md) |
| 4. Approvals | P1 | Complete | [epic-04-approvals.md](./epic-04-approvals.md) |
| 5. Vouchers | P2 | Complete | [epic-05-vouchers.md](./epic-05-vouchers.md) |
| 6. Budgets | P2 | Complete | [epic-06-budgets.md](./epic-06-budgets.md) |
| 6b. Budget Pages | P2 | Complete | [epic-06b-budget-pages.md](./epic-06b-budget-pages.md) |
| 7. Reports | P2 | Complete | [epic-07-reports.md](./epic-07-reports.md) |
| 8. Admin | P2 | Complete | [epic-08-admin.md](./epic-08-admin.md) |
| 9. OCR & Receipt | P3 | Complete | [epic-09-11-advanced.md](./epic-09-11-advanced.md) |
| 10. Pre-Approval | P3 | Complete | [epic-09-11-advanced.md](./epic-09-11-advanced.md) |
| 11. Notifications | P3 | Complete | [epic-09-11-advanced.md](./epic-09-11-advanced.md) |
| RBAC Overhaul | P0 | Complete | [epic-rbac-overhaul.md](./epic-rbac-overhaul.md) |

### All Work Complete
All epics and the RBAC overhaul have been implemented. The project is feature-complete.

### Branching Strategy
Each epic has its own feature branch. Create branch from `main` when starting an epic:
```bash
git checkout main && git pull
git checkout -b feature/epic-XX-name
```

---

## Context Loading Strategy

### Minimal Context Set (Always Load)
When starting any Phase 2 task, load these files:
```
1. .claude/tasks/CLAUDE.md (this file)
2. packages/web/CLAUDE.md (frontend conventions)
3. .claude/state/project-state.json (current state)
```

### Per-Epic Context
Load the epic's WBS file plus additional context based on which Epic you're working on:

| Epic | WBS File | Additional Context Files |
|------|----------|-------------------------|
| Epic 1 | `epic-01-ui-components.md` | `packages/web/src/styles/globals.css` |
| Epic 2 | `epic-02-dashboard.md` | `packages/api/src/modules/reports/dto/*.ts`, `packages/web/src/features/reports/services/` |
| Epic 3 | `epic-03-expenses.md` | `packages/api/src/modules/expenses/dto/*.ts`, `packages/web/src/features/expenses/services/` |
| Epic 4 | `epic-04-approvals.md` | `packages/api/src/modules/approvals/dto/*.ts`, `packages/web/src/features/approvals/services/` |
| Epic 5 | `epic-05-vouchers.md` | `packages/api/src/modules/vouchers/dto/*.ts`, `packages/web/src/features/vouchers/services/` |
| Epic 6 | `epic-06-budgets.md` | `packages/api/src/modules/budgets/dto/*.ts`, `packages/web/src/features/budgets/services/` |
| Epic 7 | `epic-07-reports.md` | `packages/api/src/modules/reports/dto/*.ts`, `packages/web/src/features/reports/services/` |
| Epic 8 | `epic-08-admin.md` | `packages/api/src/modules/*/dto/*.ts`, `packages/web/src/features/admin/services/` |
| Epic 9-11 | `epic-09-11-advanced.md` | Depends on specific epic (OCR, Pre-Approval, or Notifications) |

### API Contract Reference
Backend DTOs serve as the API contract. When building frontend:
1. Read the relevant `dto/*.ts` files from the backend module
2. Create matching TypeScript interfaces in frontend
3. Ensure RTK Query endpoints match DTO structures

---

## Multi-Agent Workflow

### Agent Selection Guide

| Task Type | Agent | When to Use |
|-----------|-------|-------------|
| UI Components | `frontend-engineer` | Building new React components |
| Page Implementation | `frontend-engineer` | Creating feature pages |
| RTK Query Services | `frontend-engineer` | API integration |
| Integration Tests | `qa-engineer` | After frontend complete |
| E2E Tests | `qa-engineer` | After integration tests |
| Code Quality | `code-reviewer` | Before merging |
| Documentation | `documentation` | After code review |

### Spawning Frontend Engineer

Use this input template when spawning the frontend-engineer agent:

```json
{
  "task_id": "{epic}-{story}-frontend",
  "feature_name": "{feature_name}",
  "module_name": "{module}",

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [/* copy from backend controller */],
    "dto_definitions": {/* copy from backend DTOs */}
  },

  "pages_required": [/* list from WBS */],
  "components_required": [/* list from WBS */],

  "constraints": {
    "must_use": ["RTK Query", "React Hook Form", "Tailwind CSS", "Zod"],
    "must_not": ["Create new primitives if ui/ exists", "Use inline styles", "Use any types"]
  }
}
```

### Parallel Execution Opportunities

These tasks can run in parallel:
1. **Independent Epics**: Epic 5 (Vouchers) and Epic 6 (Budgets) have no dependencies on each other
2. **UI Components**: Different component categories (form, display, feedback) can be built in parallel
3. **Post-Review**: Documentation and DevOps can run in parallel after code review

---

## WBS Navigation

### Epic Priority Order
```
P0 (Blocking):  Epic 1 - UI Component Library
P1 (Critical):  Epic 2 - Dashboard, Epic 3 - Expenses, Epic 4 - Approvals
P2 (Important): Epic 5 - Vouchers, Epic 6 - Budgets, Epic 7 - Reports, Epic 8 - Admin
P3 (Nice-to-have): Epic 9 - OCR, Epic 10 - Pre-Approval, Epic 11 - Notifications
```

### Task ID Convention
```
{epic_number}.{story_number}.{task_number}
Example: 3.2.1 = Epic 3, Story 2, Task 1 (ExpenseForm component)
```

### Finding Work to Do

1. **Check overview**: Read `phase2-overview.md` for dependency graph and execution order
2. **Check project state**: `.claude/state/project-state.json`
3. **Select next epic**: Based on priority (P0 → P1 → P2 → P3) and dependencies
4. **Load epic WBS**: Read the specific `epic-XX-*.md` file for detailed tasks
5. **Create feature branch**: `git checkout -b feature/epic-XX-name`
6. **Complete all stories** in the epic before merging

---

## Frontend Architecture Quick Reference

### Folder Structure
```
packages/web/src/
├── components/
│   ├── ui/              # Shared UI primitives (Epic 1)
│   ├── {feature}/       # Feature-specific components
├── features/
│   └── {feature}/
│       └── services/    # RTK Query APIs
├── pages/
│   └── {feature}/       # Route pages
├── hooks/               # Custom React hooks
├── store/               # Redux store
└── types/               # Shared TypeScript types
```

### RTK Query Pattern
```typescript
// Location: packages/web/src/features/{feature}/services/{feature}.service.ts
export const {featureName}Api = createApi({
  reducerPath: '{featureName}Api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['{EntityName}'],
  endpoints: (builder) => ({
    // queries and mutations
  }),
});
```

### Component Pattern
```typescript
// Location: packages/web/src/components/{feature}/{ComponentName}.tsx
interface {ComponentName}Props {
  // typed props
}

export const {ComponentName}: React.FC<{ComponentName}Props> = ({ ...props }) => {
  // implementation
};
```

### Page Pattern
```typescript
// Location: packages/web/src/pages/{feature}/{PageName}Page.tsx
export const {PageName}Page: React.FC = () => {
  const { data, isLoading, error } = use{Query}Query();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState />;

  return (/* page content */);
};
```

---

## Testing Checklist

### Component Tests (Frontend Engineer)
- [ ] Component renders without crashing
- [ ] Props are correctly applied
- [ ] User interactions work (click, type, submit)
- [ ] Loading states render correctly
- [ ] Error states render correctly
- [ ] Accessibility: keyboard navigation, ARIA labels

### Integration Tests (QA Engineer)
- [ ] API calls are made correctly
- [ ] Data displays correctly from API
- [ ] Form submissions work end-to-end
- [ ] Error handling works
- [ ] Cache invalidation works

### E2E Tests (QA Engineer)
- [ ] User can complete full workflow
- [ ] Navigation works correctly
- [ ] Auth guards work
- [ ] Role-based access enforced

---

## Common Pitfalls

### Avoid These
1. **Hardcoded mock data**: Always use RTK Query, even if API isn't ready (use MSW for mocking)
2. **Inline styles**: Use Tailwind classes exclusively
3. **`any` types**: Define proper interfaces from backend DTOs
4. **Missing loading states**: Always show skeleton/spinner while loading
5. **Missing error states**: Always handle and display errors gracefully
6. **Non-responsive layouts**: Test at mobile (375px), tablet (768px), desktop (1280px)

### Common Fixes
| Issue | Solution |
|-------|----------|
| Type mismatch with API | Check backend DTO, update frontend interface |
| Cache not invalidating | Verify `tagTypes` and `invalidatesTags` |
| Form not submitting | Check React Hook Form `handleSubmit` wiring |
| Component not updating | Check if using RTK Query hooks correctly |
| Styles not applying | Ensure Tailwind classes are spelled correctly |

---

## Commit Guidelines

### Commit Message Format
```
feat({scope}): {description}

- {bullet point detail}
- {bullet point detail}

Task: {task_id from WBS}
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Scope Values
- `ui`: Shared UI components (Epic 1)
- `dashboard`: Dashboard features (Epic 2)
- `expenses`: Expense management (Epic 3)
- `approvals`: Approval workflow (Epic 4)
- `vouchers`: Voucher management (Epic 5)
- `budgets`: Budget features (Epic 6)
- `reports`: Reports/analytics (Epic 7)
- `admin`: Admin features (Epic 8)
- `ocr`: OCR integration (Epic 9)
- `preapproval`: Pre-approval workflow (Epic 10)
- `notifications`: Notification system (Epic 11)

---

## Session Handoff

### Before Ending Session
1. Update `.claude/state/current-feature.json` with:
   - Completed tasks
   - In-progress task status
   - Any blockers encountered
   - Files created/modified

2. Update `.claude/state/session-notes.md` with:
   - What was accomplished
   - What's next
   - Any decisions made
   - Any issues discovered

### Starting New Session
1. Read `.claude/state/session-notes.md`
2. Read `.claude/state/current-feature.json`
3. Continue from last in-progress task

---

## Quick Commands

```bash
# Start frontend dev server
npm run dev:web

# Run frontend tests
npm run test -w @tpl-expense/web

# Check for TypeScript errors
npm run build:web

# Run linting
npm run lint

# Format code
npm run format
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Root CLAUDE.md](../../CLAUDE.md) | Project overview, commands |
| [packages/web/CLAUDE.md](../../packages/web/CLAUDE.md) | Frontend-specific patterns |
| [Frontend Engineer Agent](./../agents/frontend-engineer.md) | Agent protocol |
| [Orchestrator](./../agents/orchestrator.md) | Multi-agent coordination |
| [Dependencies](./../agents/dependencies.md) | Agent dependency graph |
| [Git Branching](./../skills/git-branching.md) | Branch strategy |
