# Task: Database Migration (Prisma)

## Overview
Safe approach to database schema changes using Prisma migrations.

---

## Migration Types

| Type | Risk Level |
|------|------------|
| Add table | Low |
| Add column (optional) | Low |
| Add column (required) | Medium |
| Modify column | High |
| Drop column | High |
| Add index | Low |

---

## Step 1: Update Prisma Schema

Edit `packages/api/prisma/schema.prisma`:

```prisma
model Expense {
  id          String   @id @default(uuid())
  amount      Decimal  @db.Decimal(12, 2)
  status      ExpenseStatus @default(DRAFT)
  submittedAt DateTime?  // NEW FIELD

  // ... rest of model
}
```

---

## Step 2: Generate Migration

```bash
# Generate migration (creates SQL file)
npx prisma migrate dev --name add_submitted_at --schema packages/api/prisma/schema.prisma

# This will:
# 1. Create migration file in packages/api/prisma/migrations/
# 2. Apply migration to dev database
# 3. Regenerate Prisma client
```

---

## Step 3: Review Migration

Check the generated SQL:
```bash
cat packages/api/prisma/migrations/[timestamp]_add_submitted_at/migration.sql
```

Example:
```sql
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "submittedAt" TIMESTAMP(3);
```

---

## Step 4: Test Migration

```bash
# Reset database and reapply all migrations (dev only)
npx prisma migrate reset --schema packages/api/prisma/schema.prisma

# Run tests
npm run test -w @tpl-expense/api
```

---

## Common Patterns

### Add Optional Column
```prisma
model Expense {
  notes String?  // nullable
}
```

### Add Required Column with Default
```prisma
model Expense {
  status ExpenseStatus @default(DRAFT)
}
```

### Add Required Column (needs data migration)
```bash
# Step 1: Add as optional
# Step 2: Run data migration to populate
# Step 3: Make required
```

### Rename Column
```sql
-- In migration.sql (edit manually)
ALTER TABLE "Expense" RENAME COLUMN "amount" TO "originalAmount";
```

### Add Index
```prisma
model Expense {
  @@index([submitterId, createdAt])
}
```

### Add Unique Constraint
```prisma
model Expense {
  expenseNumber String @unique
}
```

---

## Deployment

### Production Deployment
```bash
# Run migrations on production
npx prisma migrate deploy --schema packages/api/prisma/schema.prisma
```

### Check Migration Status
```bash
npx prisma migrate status --schema packages/api/prisma/schema.prisma
```

---

## Troubleshooting

### Migration Failed
```bash
# Check status
npx prisma migrate status --schema packages/api/prisma/schema.prisma

# Resolve (marks as applied without running)
npx prisma migrate resolve --applied [migration_name] --schema packages/api/prisma/schema.prisma
```

### Schema Drift
```bash
# Compare DB to schema
npx prisma db pull --schema packages/api/prisma/schema.prisma

# Generate migration to fix drift
npx prisma migrate dev --schema packages/api/prisma/schema.prisma
```

---

## Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] Application tested with new schema
- [ ] Prisma client regenerated
- [ ] Tests passing
- [ ] Entity types match schema
