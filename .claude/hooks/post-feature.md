# Hook: Post-Feature

## Trigger
After completing a feature implementation (all code written, tests passing).

## Purpose
Ensure documentation is updated, state files are current, and the codebase is ready for review.

---

## Checklist

### 1. Update CLAUDE.md Files

#### Root CLAUDE.md
- [ ] Move feature from "In Progress" to "Completed" in Implementation Progress
- [ ] Update "Current Focus" if needed
- [ ] Add any new modules to Module Index

#### Module CLAUDE.md (if applicable)
- [ ] Update "Completed" section
- [ ] Document any business rules discovered

### 2. Update State Files

#### `.claude/state/project-state.json`
```json
{
  "features": {
    "feature-name": {
      "status": "complete",
      "completed_at": "2026-01-30"
    }
  }
}
```

### 3. Documentation

- [ ] API documentation updated (Swagger decorators)
- [ ] CHANGELOG.md entry added
- [ ] JSDoc comments on public methods

### 4. Code Cleanup

- [ ] Remove console.log/debug statements
- [ ] Remove commented-out code
- [ ] Remove TODO comments (or create tickets)

### 5. Test Verification

- [ ] All unit tests passing: `npm run test -w @tpl-expense/api`
- [ ] Coverage meets threshold (80%+)
- [ ] No skipped tests without reason

### 6. Git Preparation

- [ ] All changes committed
- [ ] Commit messages follow convention: `type(scope): description`
- [ ] Branch is rebased on latest main

---

## Session Handoff Notes

After completing feature, update `.claude/state/session-notes.md`:

```markdown
## Session: 2026-01-30

### Completed This Session
- [x] Expense creation API
- [x] Receipt upload to S3
- [x] Unit and integration tests

### Feature Status: COMPLETE

### Ready for Review
- Branch: feature/expense-submission
- Tests: All passing
```

---

## Claude Code Integration

After completing a feature, Claude should:

1. **Update CLAUDE.md files**
   - Root: Move feature to completed
   - Module: Update completed section

2. **Update state files**
   - project-state.json
   - session-notes.md

3. **Prepare PR description** with:
   - Summary of changes
   - Testing instructions
   - Related tickets
