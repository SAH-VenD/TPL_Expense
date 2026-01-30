# Session Notes Template

## Session: [DATE]

### Goal
[One sentence: What do I want to accomplish?]

### Completed This Session
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Current State
- **Branch:** [branch name]
- **Status:** [In progress / Ready for review / Blocked]
- **Last file edited:** [path]
- **Tests:** [Passing / Failing]

### Next Session Should
1. [Priority task 1]
2. [Priority task 2]
3. [Priority task 3]

### Blockers/Questions
- [Blocker or question 1]
- [Blocker or question 2]

### Notes
- [Important discovery or decision]
- [Technical debt noted]

### Files Changed
- packages/api/src/modules/[module]/[file].ts (new/modified)
- packages/web/src/components/[file].tsx (new/modified)

---

## Handoff Context (if needed)

### To Continue
```bash
git checkout [branch]
npm install
npm run dev:api
```

### Key Files
- `packages/api/src/modules/[module]/` - Main feature code
- `.claude/skills/[skill].md` - Business rules

### Run Tests
```bash
npm run test -w @tpl-expense/api -- [module]
```
