# Commands Reference

Quick reference for all commonly used commands in this project.

---

## Development

### Start Development

```bash
# Start all services (Docker)
docker-compose up -d

# Start backend in watch mode
npm run dev:api

# Start frontend in watch mode
npm run dev:web

# Start both (uses npm-run-all)
npm run dev
```

### Stop Development

```bash
# Stop Docker services
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v
```

---

## Testing

### Unit Tests

```bash
# Run all backend unit tests
npm run test -w @tpl-expense/api

# Run tests for specific file
npm run test -w @tpl-expense/api -- expenses.service

# Run tests matching pattern
npm run test -w @tpl-expense/api -- --testNamePattern="should create"

# Run tests in watch mode
npm run test -w @tpl-expense/api -- --watch

# Run tests for changed files only
npm run test -w @tpl-expense/api -- --onlyChanged

# Run with coverage
npm run test -w @tpl-expense/api -- --coverage

# Run with coverage for specific module
npm run test -w @tpl-expense/api -- --coverage packages/api/src/modules/expenses
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration -w @tpl-expense/api

# Run specific integration test
npm run test:integration -w @tpl-expense/api -- --testPathPattern="expenses"
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e -w @tpl-expense/web

# Run specific E2E test
npm run test:e2e -w @tpl-expense/web -- --grep "expense"

# Run E2E in headed mode (see browser)
npm run test:e2e -w @tpl-expense/web -- --headed

# Run E2E with debug
npm run test:e2e -w @tpl-expense/web -- --debug
```

---

## Database

### Prisma Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate --schema packages/api/prisma/schema.prisma

# Create and run migration (development)
npx prisma migrate dev --schema packages/api/prisma/schema.prisma --name add_expense_table

# Run pending migrations (production)
npx prisma migrate deploy --schema packages/api/prisma/schema.prisma

# Reset database (drop, create, migrate, seed)
npx prisma migrate reset --schema packages/api/prisma/schema.prisma

# View migration status
npx prisma migrate status --schema packages/api/prisma/schema.prisma

# Open Prisma Studio (database GUI)
npx prisma studio --schema packages/api/prisma/schema.prisma
```

### Database Management

```bash
# Connect to database (psql)
docker-compose exec db psql -U postgres -d expense_dev

# Reset database (drop and recreate)
npm run db:reset -w @tpl-expense/api

# Seed database with test data
npm run db:seed -w @tpl-expense/api

# Dump database
docker-compose exec db pg_dump -U postgres expense_dev > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres expense_dev < backup.sql
```

---

## Code Quality

### Linting

```bash
# Run ESLint (all packages)
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Lint specific file
npx eslint packages/api/src/modules/expenses/expenses.service.ts
```

### Formatting

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format

# Format specific file
npx prettier --write packages/api/src/modules/expenses/expenses.service.ts
```

### Type Checking

```bash
# Run TypeScript compiler check (all packages)
npm run type-check

# Type check specific package
npm run type-check -w @tpl-expense/api

# Watch mode
npm run type-check -w @tpl-expense/api -- --watch
```

---

## Build

```bash
# Build backend
npm run build -w @tpl-expense/api

# Build frontend
npm run build -w @tpl-expense/web

# Build all packages
npm run build

# Build Docker images
docker build -t expense-backend:latest --target production -f docker/Dockerfile.api .
docker build -t expense-frontend:latest --target production -f docker/Dockerfile.web .

# Build and tag with version
docker build -t expense-backend:1.0.0 --target production -f docker/Dockerfile.api .
```

---

## Git

### Branching

```bash
# Create feature branch
git checkout -b feature/expense-submission

# Create bug fix branch
git checkout -b fix/123-negative-amount

# Create refactor branch
git checkout -b refactor/extract-validation

# List branches
git branch -a

# Delete merged branch
git branch -d feature/old-feature
```

### Commits

```bash
# Commit with message
git commit -m "feat(expenses): add submission endpoint"

# Amend last commit
git commit --amend

# Amend without changing message
git commit --amend --no-edit

# Interactive rebase (squash commits)
git rebase -i HEAD~3
```

### Syncing

```bash
# Fetch latest
git fetch origin

# Pull with rebase
git pull --rebase origin main

# Push branch
git push origin feature/expense-submission

# Push with force (after rebase) - use carefully
git push --force-with-lease
```

### Stashing

```bash
# Stash changes
git stash

# Stash with message
git stash push -m "WIP: expense validation"

# List stashes
git stash list

# Apply latest stash
git stash pop

# Apply specific stash
git stash apply stash@{1}

# Drop stash
git stash drop stash@{0}
```

---

## Docker

### Container Management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# View container logs
docker logs expense-backend

# Follow container logs
docker logs -f expense-backend

# Execute command in container
docker exec -it expense-backend sh

# Stop container
docker stop expense-backend

# Remove container
docker rm expense-backend
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi expense-backend:latest

# Clean up unused images
docker image prune

# Clean up everything unused
docker system prune -a
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# Start specific service
docker-compose up -d db

# View logs
docker-compose logs

# Follow logs for service
docker-compose logs -f db

# Restart service
docker-compose restart db

# Rebuild and start
docker-compose up -d --build

# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## Debugging

### Node.js Debugging

```bash
# Start with debugger
node --inspect-brk packages/api/dist/main.js

# Start NestJS with debugger
npm run start:debug -w @tpl-expense/api
```

### Database Queries

```bash
# Enable Prisma query logging (add to .env)
DEBUG=prisma:query

# Connect and run query
docker-compose exec db psql -U postgres -d expense_dev -c "SELECT * FROM \"Expense\" LIMIT 10"
```

### Network

```bash
# Check if port is in use
lsof -i :3000

# Kill process on port
kill $(lsof -t -i :3000)

# Test endpoint
curl http://localhost:3000/api/health

# Test with auth
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/expenses
```

---

## Project-Specific

### Claude Code Hooks

```bash
# Run pre-commit checks
./scripts/pre-commit.sh

# Run pre-push checks
./scripts/pre-push.sh

# Run post-feature checklist
./scripts/post-feature.sh

# Diagnose errors
./scripts/diagnose.sh
```

### State Management

```bash
# View current feature state
cat .claude/state/current-feature.json

# View session notes
cat .claude/state/session-notes.md

# View project state
cat .claude/state/project-state.json
```

### Documentation

```bash
# Generate API docs
npm run docs:generate -w @tpl-expense/api

# Serve API docs
npm run docs:serve -w @tpl-expense/api

# Open Swagger UI
open http://localhost:3000/api/docs
```

---

## Shortcuts / Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Navigation
alias api="cd packages/api"
alias web="cd packages/web"
alias shared="cd packages/shared"

# Testing
alias t="npm run test -w @tpl-expense/api"
alias tw="npm run test -w @tpl-expense/api -- --watch"
alias tc="npm run test -w @tpl-expense/api -- --coverage"

# Development
alias dev="npm run dev"
alias dapi="npm run dev:api"
alias dweb="npm run dev:web"
alias lint="npm run lint:fix"
alias build="npm run build"

# Prisma
alias prgen="npx prisma generate --schema packages/api/prisma/schema.prisma"
alias prmig="npx prisma migrate dev --schema packages/api/prisma/schema.prisma"
alias prstudio="npx prisma studio --schema packages/api/prisma/schema.prisma"

# Docker
alias dc="docker-compose"
alias dcu="docker-compose up -d"
alias dcd="docker-compose down"
alias dcl="docker-compose logs -f"

# Git
alias gs="git status"
alias gc="git commit"
alias gp="git push"
alias gl="git pull --rebase"
alias gco="git checkout"
alias gcb="git checkout -b"
```

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_dev

# JWT (RS256)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS (for S3/Textract) - LocalStack in dev
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566
S3_BUCKET_NAME=expense-receipts

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Check Environment

```bash
# Print all env vars
printenv | grep -E "DATABASE|JWT|AWS"

# Check specific var
echo $DATABASE_URL

# Load from .env file
source packages/api/.env
```
