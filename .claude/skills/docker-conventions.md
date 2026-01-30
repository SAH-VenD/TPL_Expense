# Skill: Docker Conventions

## Context
This skill contains Docker and containerization best practices for the expense automation system. Reference this when creating Dockerfiles, docker-compose configurations, or any container-related work.

---

## Project Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Backend   │  │  Frontend   │  │  PostgreSQL │             │
│  │   (NestJS)  │  │   (React)   │  │   Database  │             │
│  │   :3000     │  │   :80       │  │   :5432     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │    Redis    │  │  LocalStack │                              │
│  │   (Cache)   │  │ (S3 local)  │                              │
│  │   :6379     │  │   :4566     │                              │
│  └─────────────┘  └─────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dockerfile Standards

### Backend Dockerfile (NestJS)

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================
# Stage 3: Production
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
```

### Frontend Dockerfile (React)

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment
ARG VITE_API_URL
ARG VITE_APP_VERSION

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production (Nginx)
# ============================================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Add non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # SPA routing - serve index.html for all routes
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy (if needed)
        location /api {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }

        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check endpoint
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

---

## Docker Compose

### Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ============================================
  # Database Service
  # ============================================
  db:
    image: postgres:15-alpine
    container_name: expense-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=expense_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - expense-network

  # ============================================
  # Redis Service (Cache & Sessions)
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: expense-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - expense-network

  # ============================================
  # LocalStack (S3-compatible storage for local dev)
  # ============================================
  localstack:
    image: localstack/localstack:latest
    container_name: expense-localstack
    restart: unless-stopped
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3
      - DEBUG=0
    volumes:
      - localstack_data:/var/lib/localstack
      - ./scripts/localstack-init.sh:/etc/localstack/init/ready.d/init.sh
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - expense-network

  # ============================================
  # MailHog (Email testing)
  # ============================================
  mailhog:
    image: mailhog/mailhog:latest
    container_name: expense-mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - expense-network

# ============================================
# Networks
# ============================================
networks:
  expense-network:
    driver: bridge

# ============================================
# Volumes
# ============================================
volumes:
  postgres_data:
  redis_data:
  localstack_data:
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: ./packages/api
      dockerfile: Dockerfile
      target: production
    container_name: expense-backend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - S3_BUCKET_RECEIPTS=${S3_BUCKET_RECEIPTS}
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - expense-network

  frontend:
    build:
      context: ./packages/web
      dockerfile: Dockerfile
      target: production
      args:
        - VITE_API_URL=${VITE_API_URL}
        - VITE_APP_VERSION=${VITE_APP_VERSION}
    container_name: expense-frontend
    restart: always
    ports:
      - "80:80"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - expense-network

networks:
  expense-network:
    driver: bridge
```

---

## .dockerignore

```
# .dockerignore
# Git
.git
.gitignore

# Dependencies (will be installed in container)
node_modules
*/node_modules

# Build outputs
dist
build
*.log

# IDE
.idea
.vscode
*.swp
*.swo

# Environment files (use Docker env instead)
.env
.env.*
!.env.example

# Test files
coverage
*.test.ts
*.test.tsx
*.spec.ts
__tests__

# Documentation
docs
*.md
!README.md

# Docker files themselves
Dockerfile*
docker-compose*
.docker

# OS files
.DS_Store
Thumbs.db
```

---

## Health Check Endpoints

### Backend Health Check

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';

@Controller('api/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database connectivity
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Memory usage (fail if > 150MB heap)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // Disk space (fail if < 10% free)
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.1
      }),
    ]);
  }

  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
```

---

## Docker Commands Cheat Sheet

```bash
# Development
docker-compose up -d              # Start all services
docker-compose up -d --build      # Rebuild and start
docker-compose logs -f backend    # Follow backend logs
docker-compose exec backend sh    # Shell into backend container
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes

# Production build
docker build -t expense-backend:latest --target production ./packages/api
docker build -t expense-frontend:latest --target production ./packages/web

# Push to registry
docker tag expense-backend:latest your-registry/expense-backend:latest
docker push your-registry/expense-backend:latest

# Cleanup
docker system prune -a            # Remove all unused images
docker volume prune               # Remove unused volumes

# Debug
docker stats                      # Resource usage
docker logs --tail 100 expense-backend
docker inspect expense-backend    # Full container info
```

---

## Security Best Practices

1. **Never run as root** - Always use non-root user in production images
2. **Use specific versions** - `node:22-alpine` not `node:latest`
3. **Multi-stage builds** - Keep production images minimal
4. **No secrets in images** - Use environment variables or secrets managers
5. **Read-only filesystem** - Where possible, mount as read-only
6. **Resource limits** - Set CPU and memory limits
7. **Health checks** - Always include health checks
8. **Security scanning** - Run `docker scan` or Trivy on images

```yaml
# Example security-hardened service
services:
  backend:
    # ... other config ...
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container exits immediately | Check logs: `docker logs container_name` |
| Cannot connect to DB | Ensure depends_on with health check |
| Hot reload not working | Add `CHOKIDAR_USEPOLLING=true` |
| Permission denied on volumes | Check user/group IDs match |
| Out of disk space | Run `docker system prune` |
| Slow build times | Use BuildKit: `DOCKER_BUILDKIT=1` |
| Network issues between containers | Ensure same network, use service names |
