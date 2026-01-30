# Task: Fix Bug

## Overview
Systematic approach to diagnosing and fixing bugs without introducing regressions.

---

## Phase 1: Reproduce the Bug

### 1.1 Understand the Bug Report
- [ ] Read the bug report completely
- [ ] Note expected vs actual behavior
- [ ] Identify reproduction steps

### 1.2 Reproduce Locally
```bash
git checkout main
git pull origin main
npm install
npm run dev:api
```

- [ ] Follow exact reproduction steps
- [ ] Confirm you see the same bug

---

## Phase 2: Diagnose Root Cause

### 2.1 Locate the Bug
```bash
# Search for related code
grep -r "keyword" packages/api/src/modules/

# Check recent changes
git log --oneline -20 -- packages/api/src/modules/[module]
```

### 2.2 Identify Root Cause
```markdown
**Location:** packages/api/src/modules/expenses/dto/create-expense.dto.ts
**Cause:** Missing @IsPositive() decorator
**Why tests didn't catch it:** No unit test for negative amount
```

---

## Phase 3: Write Failing Test First

```typescript
// expenses.service.spec.ts
describe('create', () => {
  it('should reject negative amounts', async () => {
    const dto = { amount: -100, currency: 'PKR', categoryId: 'cat-1' };

    await expect(service.create('user-1', dto))
      .rejects.toThrow('Amount must be positive');
  });
});
```

```bash
npm run test -w @tpl-expense/api -- --testNamePattern="should reject negative"
# Should FAIL (red)
```

---

## Phase 4: Implement Fix

```bash
git checkout -b fix/[issue-id]-[brief-description]
```

- [ ] Fix only the specific bug
- [ ] Avoid refactoring while fixing
- [ ] Keep the diff small

```bash
npm run test -w @tpl-expense/api -- --testNamePattern="should reject negative"
# Should PASS (green)
```

---

## Phase 5: Verify No Regressions

```bash
npm run test -w @tpl-expense/api
```

---

## Phase 6: Complete

```bash
git commit -m "fix(expenses): reject negative expense amounts

- Add @IsPositive decorator
- Add regression test

Fixes #123"

git push origin fix/123-description
gh pr create --title "fix: reject negative expense amounts"
```

---

## Common Bug Categories

| Category | Typical Cause | Typical Fix |
|----------|---------------|-------------|
| Validation | Missing decorator | Add correct validation |
| Type error | Wrong type | Fix types, remove `any` |
| Null/undefined | Missing check | Add guards |
| Auth | Missing guard | Add guard decorator |
