# Orchestrator Protocol

## Overview

The Orchestrator is the main Claude Code session that coordinates work across specialized agents. It maintains the big picture, manages dependencies, and ensures quality across the entire project.

---

## Orchestrator Responsibilities

1. **Planning**: Break down features into agent tasks
2. **Coordination**: Manage task dependencies and sequencing
3. **Context Management**: Prepare minimal context for each agent
4. **Integration**: Aggregate agent outputs
5. **Quality Gates**: Ensure all agents complete successfully
6. **State Tracking**: Maintain project state across sessions

---

## When to Use Orchestrator vs. Direct Work

### Use Orchestrator (Spawn Agents) When:
- Feature requires work across multiple layers (backend + frontend)
- Task is self-contained with clear inputs/outputs
- Context is getting too long (approaching 50% of window)
- Task benefits from deep focus on one area
- You need parallel work on independent components

### Work Directly (No Agents) When:
- Quick fix or small change
- Debugging that needs full context
- Cross-cutting decision that affects multiple areas
- Task boundaries are unclear
- Rapid iteration with user feedback

---

## Feature Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. FEATURE KICKOFF                            │
│                                                                  │
│  • Read requirements (PRD, ticket, user request)                │
│  • Break down into agent tasks                                  │
│  • Identify dependencies                                        │
│  • Create execution plan                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. PARALLEL EXECUTION                         │
│                                                                  │
│  Backend Engineer ──────────┬──────────── Frontend Engineer     │
│         │                   │                    │               │
│         │            (if independent)            │               │
│         │                   │                    │               │
│         └───────────────────┴────────────────────┘               │
│                             │                                    │
│                    API Contracts                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. SEQUENTIAL EXECUTION                       │
│                                                                  │
│  QA Engineer ──► Code Reviewer ──► Documentation ──► DevOps     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. COMPLETION                                 │
│                                                                  │
│  • Verify all tasks complete                                    │
│  • Update state files                                           │
│  • Commit with proper message                                   │
│  • Update CLAUDE.md                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task Breakdown Template

When starting a new feature, create a task breakdown:

```markdown
## Feature: [Feature Name]

### Requirements Summary
[Brief description of what needs to be built]

### Agent Tasks

#### 1. Backend Engineer
- **Task ID:** [feature]-backend
- **Depends On:** None
- **Inputs:**
  - Requirements document
  - Related entity interfaces
- **Outputs:**
  - Prisma schema updates, services, controllers
  - Unit tests
  - API contracts (DTOs)
- **Estimated Complexity:** Medium

#### 2. Frontend Engineer
- **Task ID:** [feature]-frontend
- **Depends On:** Backend (needs API contracts)
- **Inputs:**
  - API contracts from backend
  - Design requirements
- **Outputs:**
  - Components, pages, RTK Query hooks
  - Component tests
- **Estimated Complexity:** Medium

#### 3. QA Engineer
- **Task ID:** [feature]-qa
- **Depends On:** Backend, Frontend
- **Inputs:**
  - Backend endpoints
  - Frontend components
  - User flows
- **Outputs:**
  - Integration tests
  - E2E tests
  - Bug reports
- **Estimated Complexity:** Medium

#### 4. Code Reviewer
- **Task ID:** [feature]-review
- **Depends On:** QA (tests must pass first)
- **Inputs:**
  - All created files
  - Test results
- **Outputs:**
  - Review verdict
  - Issue list
- **Estimated Complexity:** Low

#### 5. Documentation
- **Task ID:** [feature]-docs
- **Depends On:** Code Reviewer (code must be approved)
- **Inputs:**
  - Completed feature files
  - API contracts
- **Outputs:**
  - Updated CLAUDE.md
  - API docs
  - Changelog entry
- **Estimated Complexity:** Low

### Execution Order
1. Backend Engineer (independent)
2. Frontend Engineer (after backend API contracts ready)
3. QA Engineer (after both complete)
4. Code Reviewer (after QA passes)
5. Documentation (after review approved)

### Risk Factors
- [Potential blocker 1]
- [Potential blocker 2]
```

---

## State Management

### State Directory Structure

```
.claude/
├── state/
│   ├── project-state.json      # Overall project state
│   ├── current-feature.json    # Active feature being worked on
│   └── session-notes.md        # Notes for session continuity
├── outputs/
│   ├── [task-id]-output.json   # Output from each agent task
│   └── ...
└── logs/
    └── orchestrator.log        # Orchestrator decisions and actions
```

### project-state.json

```json
{
  "project_name": "tpl-expense",
  "current_phase": "phase-1",
  "last_updated": "2026-01-30T10:00:00Z",

  "features": {
    "auth": { "status": "complete", "completed_at": "2026-01-28" },
    "users": { "status": "complete", "completed_at": "2026-01-29" },
    "expenses": { "status": "in_progress", "started_at": "2026-01-30" },
    "approvals": { "status": "pending" },
    "vouchers": { "status": "pending" }
  },

  "agents_available": [
    "backend-engineer",
    "frontend-engineer",
    "qa-engineer",
    "code-reviewer",
    "devops-engineer",
    "documentation"
  ],

  "recent_sessions": [
    {
      "date": "2026-01-30",
      "focus": "Expense submission flow",
      "tasks_completed": ["expenses-backend", "expenses-frontend"],
      "tasks_remaining": ["expenses-qa", "expenses-review", "expenses-docs"]
    }
  ]
}
```

### current-feature.json

```json
{
  "feature": "expense-submission",
  "started_at": "2026-01-30T09:00:00Z",
  "requirements_source": "PRD Section 5: Expense Management",

  "tasks": {
    "expenses-backend": {
      "agent": "backend-engineer",
      "status": "complete",
      "output_file": ".claude/outputs/expenses-backend-output.json"
    },
    "expenses-frontend": {
      "agent": "frontend-engineer",
      "status": "complete",
      "output_file": ".claude/outputs/expenses-frontend-output.json"
    },
    "expenses-qa": {
      "agent": "qa-engineer",
      "status": "in_progress",
      "depends_on": ["expenses-backend", "expenses-frontend"]
    },
    "expenses-review": {
      "agent": "code-reviewer",
      "status": "pending",
      "depends_on": ["expenses-qa"]
    },
    "expenses-docs": {
      "agent": "documentation",
      "status": "pending",
      "depends_on": ["expenses-review"]
    }
  },

  "handoff_data": {
    "api_contracts": { /* from backend */ },
    "component_interfaces": { /* from frontend */ }
  },

  "blockers": [],
  "notes": []
}
```

---

## Git Workflow Integration

### Branch Management

```bash
# Feature branch naming
feature/[module]-[description]

# Example
feature/expenses-submission
feature/approvals-workflow
```

### Commit Strategy

Each agent task = one commit (or logical group of commits)

```bash
# Backend complete
git add packages/api/src/modules/expenses/
git commit -m "feat(expenses): add expense submission backend

- Add Expense service with CRUD operations
- Add ExpensesController with validation
- Add unit tests (85% coverage)

Task: expenses-backend"

# Frontend complete
git add packages/web/src/
git commit -m "feat(expenses): add expense submission UI

- Add ExpenseForm component with validation
- Add ExpenseList page with filters
- Add RTK Query hooks for expenses
- Add component tests

Task: expenses-frontend"
```

### PR Process

1. Agent completes task → Commit
2. All agents complete → Code Review agent
3. Review passes → Push to feature branch
4. Create PR to main
5. CI passes → Merge

---

## Commands Reference

```bash
# Development
docker-compose up -d          # Start all services
npm run dev:api               # Start backend (port 3000)
npm run dev:web               # Start frontend (port 5173)

# Testing
npm run test -w @tpl-expense/api   # Backend unit tests
npm run test -w @tpl-expense/web   # Frontend unit tests

# Database
npm run db:migrate -w @tpl-expense/api   # Run migrations
npm run db:seed -w @tpl-expense/api      # Seed test data

# Build
npm run build -w @tpl-expense/api        # Build backend
npm run build -w @tpl-expense/web        # Build frontend
```

---

## Checklists

### Feature Start Checklist
- [ ] Requirements clear
- [ ] Task breakdown created
- [ ] Dependencies identified
- [ ] State files initialized
- [ ] Feature branch created

### Agent Task Checklist
- [ ] Context prepared (minimal)
- [ ] Input JSON created
- [ ] Agent spawned
- [ ] Output captured
- [ ] State updated

### Feature Complete Checklist
- [ ] All agent tasks complete
- [ ] Code review passed
- [ ] Documentation updated
- [ ] Tests passing
- [ ] CLAUDE.md updated
- [ ] Committed with proper message
- [ ] State files updated
