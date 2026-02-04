# Task: Fix Receipt Viewer Modal Not Displaying Images

## Problem
The `ReceiptViewerModal` component shows "Preview not available for this file type" and "Image failed to load" instead of displaying the actual PNG image.

## Root Cause
1. `STORAGE_TYPE` is not set in `.env`, defaulting to `'local'`
2. `LocalStorageProvider.getSignedUrl()` returns URLs like `http://localhost:3000/uploads/receipts/...`
3. **NestJS has no static file serving configured** for the `/uploads` directory
4. Browser gets 404 error when loading the image URL, triggering the `onError` handler

---

## Implementation Steps

### Step 0: Git Preparation
1. Check git status for uncommitted changes
2. Commit/push any pending changes to main
3. Create feature branch: `fix/receipt-viewer-image-display`

### Step 1: Enable S3/LocalStack (Quick Fix)

**File: `packages/api/.env`**
Add:
```
STORAGE_TYPE=s3
```

**File: `packages/api/.env.example`**
Add after AWS config section:
```
# Storage (s3 for LocalStack/AWS, local for file system)
STORAGE_TYPE=s3
```

### Step 2: Add Static File Serving (Fallback for local storage)

**Install dependency:**
```bash
npm install @nestjs/serve-static -w @tpl-expense/api
```

**Update `packages/api/src/app.module.ts`:**

Add imports:
```typescript
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
```

Add to imports array (conditional):
```typescript
// Static file serving for local storage development
...(process.env.STORAGE_TYPE !== 's3' ? [
  ServeStaticModule.forRoot({
    rootPath: join(process.cwd(), 'uploads'),
    serveRoot: '/uploads',
    serveStaticOptions: {
      index: false,
      fallthrough: false,
    },
  }),
] : []),
```

---

## Files to Modify
| File | Change |
|------|--------|
| `packages/api/.env` | Add `STORAGE_TYPE=s3` |
| `packages/api/.env.example` | Document `STORAGE_TYPE` option |
| `packages/api/package.json` | Add `@nestjs/serve-static` dependency |
| `packages/api/src/app.module.ts` | Add `ServeStaticModule` import and config |

---

## Verification
1. Restart backend: `npm run dev:api`
2. Ensure LocalStack is running: `docker-compose up -d localstack`
3. Upload a new receipt via UI or Swagger
4. Open the receipt in ReceiptViewerModal
5. Image should display correctly
6. Network tab should show URL: `http://localhost:4566/expense-receipts/receipts/...`

---

## Post-Implementation
1. Run QA agent to verify the fix
2. Run code review agent
3. Create PR for review

## Note
Existing locally-stored receipts won't work after switching to S3 - they need to be re-uploaded. This is acceptable for development data.
