# Hook: On-Error

## Trigger
When an error or failure occurs during development, testing, or deployment.

## Purpose
Systematic approach to diagnosing and resolving errors.

---

## Error Classification

### Level 1: Compilation/Build Errors
- TypeScript errors
- Import/module resolution errors
- Build failures

### Level 2: Runtime Errors
- Unhandled exceptions
- API errors (4xx, 5xx)
- Database errors

### Level 3: Test Failures
- Unit test failures
- Integration test failures

### Level 4: Infrastructure Errors
- Docker errors
- CI/CD pipeline failures

---

## Diagnosis Protocol

### Step 1: Identify Error Type

| Error Pattern | Type | Section |
|---------------|------|---------|
| `Cannot find module` | Import | Import Resolution |
| `Type 'X' is not assignable` | TypeScript | Type Errors |
| `ECONNREFUSED` | Connection | Connection Errors |
| `P2002: Unique constraint` | Prisma | Database Errors |
| `Jest: X failed` | Test | Test Failures |

---

## Resolution Guides

### Import Resolution Errors

```
Cannot find module 'X' or its corresponding type declarations
```

**Diagnosis:**
```bash
npm ls X
cat packages/api/tsconfig.json | grep "paths"
```

**Common Fixes:**
1. Install missing package: `npm install X`
2. Install types: `npm install -D @types/X`
3. Fix import path (relative vs absolute)
4. Restart TypeScript server

---

### TypeScript Type Errors

```
Type 'X' is not assignable to type 'Y'
```

**Diagnosis:**
```bash
npx tsc --noEmit -p packages/api/tsconfig.json 2>&1 | head -50
```

**Common Fixes:**
1. Fix the type mismatch
2. Add type assertion: `value as Type`
3. Make property optional: `prop?: Type`
4. Check for null/undefined: `value?.prop`

---

### Prisma/Database Errors

```
P2002: Unique constraint failed
P2025: Record not found
```

**Diagnosis:**
```bash
# Check database connection
npx prisma db pull --schema packages/api/prisma/schema.prisma

# Check pending migrations
npx prisma migrate status --schema packages/api/prisma/schema.prisma
```

**Common Fixes:**
1. Run migrations: `npm run db:migrate -w @tpl-expense/api`
2. Generate Prisma client: `npx prisma generate --schema packages/api/prisma/schema.prisma`
3. Check DATABASE_URL in .env
4. Restart database container: `docker-compose restart postgres`

---

### Connection Errors

```
ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**
```bash
docker ps | grep postgres
lsof -i :5432
echo $DATABASE_URL
```

**Common Fixes:**
1. Start the service: `docker-compose up -d postgres`
2. Fix DATABASE_URL in packages/api/.env
3. Wait for service to be ready

---

### Test Failures

```
FAIL packages/api/src/modules/expenses/expenses.service.spec.ts
```

**Diagnosis:**
```bash
npm run test -w @tpl-expense/api -- --verbose expenses.service.spec.ts
```

**Common Fixes:**
1. Read the assertion error carefully
2. Check mock setup
3. Check async/await handling
4. Verify expected vs actual values

---

## Automated Diagnosis Script

```bash
#!/bin/bash
# scripts/diagnose.sh

echo "Error Diagnosis Tool"
echo "==================="

# Check Node/npm
echo -e "\n[1] Node/npm..."
node --version
npm --version

# Check dependencies
echo -e "\n[2] Dependencies..."
if [ -d "node_modules" ]; then
    echo "node_modules exists"
else
    echo "node_modules missing - run: npm install"
fi

# Check environment
echo -e "\n[3] Environment..."
if [ -f "packages/api/.env" ]; then
    echo ".env exists"
    for var in DATABASE_URL JWT_ACCESS_SECRET; do
        if grep -q "^$var=" packages/api/.env; then
            echo "  $var is set"
        else
            echo "  $var is MISSING"
        fi
    done
else
    echo ".env missing - copy from .env.example"
fi

# Check Docker
echo -e "\n[4] Docker..."
if docker info > /dev/null 2>&1; then
    echo "Docker is running"
    docker ps --format "table {{.Names}}\t{{.Status}}"
else
    echo "Docker is not running"
fi

# Check TypeScript
echo -e "\n[5] TypeScript..."
npx tsc --noEmit -p packages/api/tsconfig.json 2>&1 | head -10

# Check ports
echo -e "\n[6] Ports..."
for port in 3000 5173 5432 6379; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "  Port $port: IN USE"
    else
        echo "  Port $port: FREE"
    fi
done
```

---

## Error Log Template

```markdown
# Error: [Brief Description]

## Error Message
```
[Full error message]
```

## Context
- **Task:** What was I trying to do
- **File:** Where the error occurred
- **Command:** What command triggered it

## Root Cause
[What caused the error]

## Solution
[How it was fixed]

## Prevention
[How to avoid this in the future]
```
