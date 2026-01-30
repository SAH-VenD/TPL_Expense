# Task: Refactor Code

## Golden Rules

1. **Never refactor and add features simultaneously**
2. **Tests must pass before AND after**
3. **Small, incremental changes**
4. **Commit frequently**
5. **If tests fail, revert and try smaller change**

---

## Pre-Refactor Checklist

### 1. Ensure Test Coverage
```bash
npm run test -w @tpl-expense/api -- --coverage packages/api/src/modules/[module]
```
Minimum: 80% line coverage

### 2. Commit Current State
```bash
git commit -m "checkpoint: before refactoring [area]"
```

### 3. Run All Tests (Baseline)
```bash
npm run test -w @tpl-expense/api
```

---

## Refactoring Process

### Phase 1: Prepare
```bash
git checkout -b refactor/[description]
npm run test -w @tpl-expense/api -- --watch
```

### Phase 2: Small Steps

For each change:
1. Make ONE small change
2. Run tests immediately
3. If green, commit
4. If red, revert

```bash
# Quick test after each change
npm run test -w @tpl-expense/api -- --onlyChanged

# If tests fail, revert
git checkout -- .

# If tests pass, commit
git commit -m "refactor: [specific change]"
```

---

## Common Patterns

### Extract Method

**Before:**
```typescript
async createExpense(dto) {
  // Validation (20 lines)
  if (!dto.amount || dto.amount <= 0) {
    throw new BadRequestException('Amount must be positive');
  }
  // ... more validation

  const expense = this.prisma.expense.create({ data: dto });
  return expense;
}
```

**After:**
```typescript
async createExpense(dto) {
  this.validateCreateExpense(dto);
  return this.prisma.expense.create({ data: dto });
}

private validateCreateExpense(dto): void {
  if (!dto.amount || dto.amount <= 0) {
    throw new BadRequestException('Amount must be positive');
  }
}
```

---

## Commit Strategy

```bash
git commit -m "refactor: extract validateExpense method"
git commit -m "refactor: rename amount -> originalAmount"
git commit -m "refactor: move currency logic to CurrencyService"
```

---

## When to Stop

**Stop refactoring when:**
- Tests start failing
- You're tempted to add a feature
- Change is getting larger than planned

**If stuck:**
```bash
git checkout -- .
# Or
git reset --hard HEAD
```

---

## Post-Refactor Checklist

- [ ] All tests passing
- [ ] Type check passing
- [ ] Lint passing
- [ ] Coverage same or better
- [ ] Code is actually cleaner
- [ ] No functionality changed
