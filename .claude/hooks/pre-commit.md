# Hook: Pre-Commit

## Trigger
Before any `git commit` command is executed.

## Purpose
Ensure code quality before committing. Catches issues early before they enter version control.

---

## Checks to Run

### 1. TypeScript Compilation
```bash
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p packages/web/tsconfig.json
```
- Must pass with zero errors

### 2. Linting
```bash
npm run lint -w @tpl-expense/api
npm run lint -w @tpl-expense/web
```
- ESLint must pass with zero errors

### 3. Formatting Check
```bash
npx prettier --check "packages/**/*.{ts,tsx,js,jsx,json}"
```
- All files must be properly formatted

### 4. Unit Tests (Changed Files Only)
```bash
npm run test -w @tpl-expense/api -- --onlyChanged --passWithNoTests
```
- Only run tests for files that changed

---

## Automated Script

Create this as `scripts/pre-commit.sh`:

```bash
#!/bin/bash
set -e

echo "Running pre-commit checks..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# 1. TypeScript (API)
echo -e "\n${YELLOW}[1/4] TypeScript (API)...${NC}"
if npx tsc --noEmit -p packages/api/tsconfig.json; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}TypeScript errors (API)${NC}"
    FAILED=1
fi

# 2. TypeScript (Web)
echo -e "\n${YELLOW}[2/4] TypeScript (Web)...${NC}"
if npx tsc --noEmit -p packages/web/tsconfig.json; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}TypeScript errors (Web)${NC}"
    FAILED=1
fi

# 3. Linting
echo -e "\n${YELLOW}[3/4] Linting...${NC}"
if npm run lint --silent 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Lint errors${NC}"
    FAILED=1
fi

# 4. Unit tests (changed files)
echo -e "\n${YELLOW}[4/4] Unit tests...${NC}"
if npm run test -w @tpl-expense/api -- --onlyChanged --passWithNoTests --silent 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Tests failed${NC}"
    FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All pre-commit checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-commit checks failed${NC}"
    exit 1
fi
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| TypeScript: Cannot find module | Run `npm install` |
| ESLint: Parsing error | Check for syntax errors |
| Prettier: Check failed | Run `npx prettier --write` |
| Tests timeout | Check async handling |
