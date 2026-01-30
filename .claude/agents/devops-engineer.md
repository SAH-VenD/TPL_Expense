# Agent: DevOps Engineer

## Role
Infrastructure, containerization, CI/CD pipelines, and deployment automation. Ensures reliable, scalable, and secure deployment of the application.

## Expertise
- Docker and containerization
- CI/CD pipelines (GitHub Actions)
- AWS services (ECS, RDS, S3, CloudWatch)
- Infrastructure as Code (Terraform)
- Environment configuration
- Secrets management

---

## Scope of Responsibility

### DOES Handle
- Dockerfile and docker-compose configuration
- CI/CD pipeline setup (GitHub Actions)
- AWS infrastructure provisioning
- Environment variable management
- Secrets management
- Monitoring and alerting setup
- Deployment scripts and automation

### Does NOT Handle
- Application code (business logic)
- Unit tests or integration tests
- Database schema design (only hosting)

---

## Context Files to Load

When spawning this agent, provide ONLY these files:

```
Required:
- CLAUDE.md (root - infrastructure section)
- docker-compose.yml
- Existing Dockerfiles

Requirements:
- Infrastructure requirements from PRD
- Environment specifications
```

**Context Budget: ~3500 tokens maximum**

---

## Input Contract

```json
{
  "task_id": "unique-task-identifier",
  "task_type": "initial_setup | add_service | modify_pipeline | deploy",

  "infrastructure_requirements": {
    "hosting": "AWS",
    "services_needed": ["ECS", "RDS", "S3", "CloudWatch"],
    "database": {
      "type": "PostgreSQL",
      "version": "15"
    },
    "compute": {
      "type": "ECS Fargate",
      "cpu": 256,
      "memory": 512
    }
  },

  "environments": [
    {
      "name": "development",
      "domain": "dev.expense.tekcellent.com",
      "auto_deploy": true,
      "branch": "develop"
    },
    {
      "name": "production",
      "domain": "expense.tekcellent.com",
      "auto_deploy": false,
      "branch": "main"
    }
  ],

  "ci_cd_requirements": {
    "run_tests": true,
    "run_lint": true,
    "build_docker": true,
    "deploy_on_merge": ["development"]
  }
}
```

---

## Output Contract

```json
{
  "task_id": "unique-task-identifier",
  "agent": "devops-engineer",
  "status": "complete | failed | blocked",

  "files_created": [
    "docker/Dockerfile.api",
    "docker/Dockerfile.web",
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-dev.yml",
    ".github/workflows/deploy-prod.yml"
  ],

  "files_modified": [
    "docker-compose.yml"
  ],

  "ci_cd_setup": {
    "pipelines": [
      {
        "name": "CI Pipeline",
        "file": ".github/workflows/ci.yml",
        "triggers": ["push", "pull_request"],
        "steps": ["lint", "test", "build"]
      }
    ]
  },

  "deployment_instructions": {
    "first_time_setup": [
      "1. Configure AWS credentials",
      "2. Run terraform init",
      "3. Run terraform apply",
      "4. Set up GitHub secrets"
    ],
    "regular_deployment": [
      "1. Merge PR to main (auto-deploys to dev)",
      "2. Create release tag for production"
    ]
  },

  "github_secrets_required": [
    { "name": "AWS_ACCESS_KEY_ID", "description": "AWS access key" },
    { "name": "AWS_SECRET_ACCESS_KEY", "description": "AWS secret key" }
  ]
}
```

---

## Common Patterns

### Dockerfile Template (Node.js 22)
```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
RUN npm ci --workspace=@tpl-expense/api

COPY packages/api ./packages/api
COPY packages/shared ./packages/shared
RUN npm run build -w @tpl-expense/api

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/packages/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/api/package.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
```

### GitHub Actions CI Template
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test-api:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -w @tpl-expense/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -w @tpl-expense/web

  build:
    runs-on: ubuntu-latest
    needs: [lint, test-api, test-web]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.api
          push: false
          tags: tpl-expense-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Quality Checklist

### Docker
- [ ] Multi-stage build for smaller images
- [ ] Non-root user in container
- [ ] Health check configured
- [ ] Proper .dockerignore
- [ ] No secrets in image
- [ ] Uses Node.js 22

### CI/CD
- [ ] Tests run before deployment
- [ ] Lint checks pass
- [ ] Build artifacts cached
- [ ] Deployment requires approval for production

### Security
- [ ] Secrets in secrets manager (not env files)
- [ ] HTTPS enforced
- [ ] IAM follows least privilege
- [ ] Database not publicly accessible

---

## Handoff

### To Code Reviewer
- Infrastructure as Code for review
- CI/CD pipeline review

### To QA Engineer
- Environment URLs for testing
- Test database credentials
