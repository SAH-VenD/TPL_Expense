# Hook: Session End

## Trigger
Before ending a Claude Code session.

## Purpose
Preserve context for next session. Ensure no work is lost.

---

## Session End Checklist

### 1. Commit All Work

```bash
# Check for uncommitted changes
git status

# Stage and commit if needed
git add -A
git commit -m "wip: [description of current state]"

# Or if feature complete:
git commit -m "feat(module): [completed feature description]"
```

**Never leave uncommitted work.**

### 2. Push to Remote (Recommended)

```bash
git push origin $(git branch --show-current)
```

### 3. Update Session Notes

Update `.claude/state/session-notes.md`:

```markdown
## Session: [DATE]

### Completed This Session
- [x] Task 1
- [x] Task 2
- [ ] Task 3 (partial - 70% done)

### Current State
- **Branch:** feature/expense-submission
- **Status:** In progress
- **Last file edited:** packages/api/src/modules/expenses/expenses.service.ts
- **Tests:** All passing

### Next Session Should
1. Complete Task 3
2. Start Task 4
3. Run integration tests

### Blockers/Questions
- Need clarification on X
```

### 4. Update Feature State

Update `.claude/state/project-state.json` if needed.

### 5. Quick Health Check

```bash
# Ensure tests still pass
npm run test -w @tpl-expense/api -- --onlyChanged

# Don't leave session with failing tests
```

---

## Session Summary Template

```markdown
## Session Summary: [DATE]

**Branch:** feature/expense-submission
**Commits:** 3

### What Was Done
- Implemented ExpensesService.create()
- Added validation for expense amounts
- Wrote 5 unit tests (all passing)

### What's Next
- Complete ExpensesController
- Add integration tests

### Files Changed
- packages/api/src/modules/expenses/expenses.service.ts (new)
- packages/api/src/modules/expenses/expenses.service.spec.ts (new)
```

---

## Session End Announcement

When ending, Claude should state:

```
Session ending. Saving progress...

Summary:
- Completed: ExpensesService implementation, unit tests
- In progress: ExpensesController (50%)
- Next: Complete controller, add integration tests

Changes committed: "wip: expense service complete"
Branch pushed: feature/expense-submission

Session notes updated.
Ready to resume anytime.
```

---

## Emergency Exit

If session must end abruptly:

```bash
# Quick save everything
git stash push -m "emergency-$(date +%Y%m%d-%H%M%S)"

# Or commit as WIP
git add -A && git commit -m "wip: emergency save"
```

**At minimum:**
1. Commit or stash changes
2. Note current state in session notes
