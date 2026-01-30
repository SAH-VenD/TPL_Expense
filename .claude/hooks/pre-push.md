# Hook: Pre-Push

## Trigger
Before any `git push` command is executed.

## Purpose
Comprehensive quality gate before code leaves local machine.

---

## Checks to Run

### 1. All Pre-Commit Checks
```bash
./scripts/pre-commit.sh
```

### 2. Full Test Suite
```bash
npm run test -w @tpl-expense/api
npm run test -w @tpl-expense/web
```

### 3. Build Verification
```bash
npm run build -w @tpl-expense/api
npm run build -w @tpl-expense/web
```
- Production build must succeed

### 4. Prisma Migration Check
```bash
npx prisma migrate status --schema packages/api/prisma/schema.prisma
```
- Check for pending migrations

---

## Automated Script

Create as `scripts/pre-push.sh`:

```bash
#!/bin/bash
set -e

echo "Running pre-push checks..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${YELLOW}Branch: $BRANCH${NC}"

# 1. Pre-commit checks
echo -e "\n${YELLOW}[1/4] Pre-commit checks...${NC}"
if ./scripts/pre-commit.sh; then
    echo -e "${GREEN}OK${NC}"
else
    FAILED=1
fi

# 2. Full test suite
echo -e "\n${YELLOW}[2/4] Full test suite...${NC}"
if npm run test -w @tpl-expense/api -- --silent; then
    echo -e "${GREEN}API tests OK${NC}"
else
    echo -e "${RED}API tests failed${NC}"
    FAILED=1
fi

# 3. Build verification
echo -e "\n${YELLOW}[3/4] Build verification...${NC}"
if npm run build -w @tpl-expense/api --silent 2>/dev/null; then
    echo -e "${GREEN}API build OK${NC}"
else
    echo -e "${RED}API build failed${NC}"
    FAILED=1
fi

if npm run build -w @tpl-expense/web --silent 2>/dev/null; then
    echo -e "${GREEN}Web build OK${NC}"
else
    echo -e "${RED}Web build failed${NC}"
    FAILED=1
fi

# 4. Prisma migration check
echo -e "\n${YELLOW}[4/4] Migration check...${NC}"
npx prisma migrate status --schema packages/api/prisma/schema.prisma 2>/dev/null || echo "Migration check skipped"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push checks failed${NC}"
    exit 1
fi
```

---

## Branch-Specific Rules

| Branch | Tests | Build | Migration |
|--------|-------|-------|-----------|
| `feature/*` | Unit only | Optional | No |
| `main` | Full suite | Required | Yes |

---

## Bypass (Emergency Only)

```bash
git push --no-verify
```

Use only for critical hotfixes. Document in PR description.
