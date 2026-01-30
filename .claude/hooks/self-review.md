# Hook: Code Review Self-Check

## Trigger
Before creating a PR or requesting code review.

## Purpose
Catch common issues before reviewer sees them.

---

## Quick Self-Review Checklist

### Must Pass (Blocking)

- [ ] **All tests pass** - `npm run test -w @tpl-expense/api`
- [ ] **Type check passes** - `npx tsc --noEmit`
- [ ] **Lint passes** - `npm run lint`
- [ ] **Build succeeds** - `npm run build -w @tpl-expense/api`

### Code Quality

- [ ] No `console.log` or `debugger` statements
- [ ] No commented-out code
- [ ] No `any` types (or justified with comment)
- [ ] No TODO without ticket reference
- [ ] No hardcoded values (use constants/config)

### Naming

- [ ] Variable names are descriptive
- [ ] Function names describe what they do
- [ ] Boolean variables start with `is`, `has`, `should`, `can`
- [ ] Arrays are plural (`expenses`, not `expense`)

### Functions

- [ ] Functions do one thing
- [ ] Functions are < 50 lines
- [ ] Max 3-4 parameters
- [ ] Early returns for error cases

### Error Handling

- [ ] All async operations have try/catch
- [ ] Errors have meaningful messages
- [ ] Correct error types (NotFound, BadRequest, etc.)
- [ ] No swallowed errors

### Security

- [ ] No secrets in code
- [ ] Input validation on all user input
- [ ] Auth checks on protected endpoints
- [ ] No sensitive data in logs

### Testing

- [ ] New code has tests
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] 80%+ coverage

---

## Automated Self-Review Script

```bash
#!/bin/bash
# scripts/self-review.sh

echo "Running self-review checks..."

ISSUES=0

# Check for console.log
echo "Checking for console.log..."
if grep -r "console.log\|console.debug" --include="*.ts" --include="*.tsx" packages/ | grep -v "node_modules" | grep -v ".test." | grep -v ".spec."; then
    echo "Found console.log statements"
    ISSUES=$((ISSUES + 1))
fi

# Check for debugger
echo "Checking for debugger..."
if grep -r "debugger" --include="*.ts" --include="*.tsx" packages/; then
    echo "Found debugger statements"
    ISSUES=$((ISSUES + 1))
fi

# Check for any type
echo "Checking for 'any' type..."
ANY_COUNT=$(grep -r ": any" --include="*.ts" packages/ | grep -v "node_modules" | grep -v ".d.ts" | wc -l)
if [ "$ANY_COUNT" -gt 0 ]; then
    echo "Found $ANY_COUNT 'any' types"
    grep -r ": any" --include="*.ts" packages/ | grep -v "node_modules" | grep -v ".d.ts" | head -5
    ISSUES=$((ISSUES + 1))
fi

# Run tests
echo "Running tests..."
npm run test -w @tpl-expense/api -- --silent
if [ $? -ne 0 ]; then
    echo "Tests failed"
    ISSUES=$((ISSUES + 1))
fi

# Run type check
echo "Running type check..."
npx tsc --noEmit -p packages/api/tsconfig.json
if [ $? -ne 0 ]; then
    echo "Type check failed"
    ISSUES=$((ISSUES + 1))
fi

# Summary
echo ""
if [ $ISSUES -eq 0 ]; then
    echo "Self-review passed! Ready for PR"
else
    echo "Found $ISSUES issue(s) to address"
fi
```

---

## Review Your Own Diff

```bash
# See all changes vs main
git diff main...HEAD

# See changed files
git diff main...HEAD --name-only

# See stats
git diff main...HEAD --stat
```

**Ask yourself:**
- Does each file change make sense?
- Is there anything I forgot?
- Would I approve this PR?

---

## Common Issues to Watch For

### TypeScript

```typescript
// Bad
const data: any = response.data;

// Good
const data: ExpenseResponse = response.data;
```

### Error Handling

```typescript
// Bad
try {
  await something();
} catch (e) { }  // Swallowed error

// Good
try {
  await something();
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new InternalServerErrorException('Operation failed');
}
```

### Magic Numbers

```typescript
// Bad
if (amount > 50000) { }

// Good
const MAX_EXPENSE_AMOUNT = 50000;
if (amount > MAX_EXPENSE_AMOUNT) { }
```

---

## PR Description Template

```markdown
## Summary
[One paragraph describing the change]

## Changes
- Change 1
- Change 2

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing done

## How to Test
1. Step 1
2. Step 2
3. Expected result

## Checklist
- [ ] Self-review done
- [ ] Tests pass
- [ ] No console.log
- [ ] No any types

## Related
- Fixes #123
```
