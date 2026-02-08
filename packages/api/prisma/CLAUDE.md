# TPL Expense - Prisma Database Layer

## Schema Location
`packages/api/prisma/schema.prisma`

## Commands
```bash
# Generate Prisma Client after schema changes
npx prisma generate --schema packages/api/prisma/schema.prisma

# Create migration
npx prisma migrate dev --name {migration_name} --schema packages/api/prisma/schema.prisma

# Apply migrations (production)
npx prisma migrate deploy --schema packages/api/prisma/schema.prisma

# Open Prisma Studio (database GUI)
npx prisma studio --schema packages/api/prisma/schema.prisma

# Reset database (WARNING: deletes all data)
npx prisma migrate reset --schema packages/api/prisma/schema.prisma
```

## Entity Groups

### Core Entities
| Entity | Description |
|--------|-------------|
| User | Authentication & org hierarchy |
| Department | Organizational units (hierarchical) |
| Category | Expense categories (hierarchical) |
| Project | Client projects |
| CostCenter | Cost allocation units |

### Expense Entities
| Entity | Description |
|--------|-------------|
| Expense | Main expense records |
| ExpenseSplit | Split expenses across categories |
| Receipt | Uploaded receipt files + OCR data |
| Attachment | Additional expense attachments |
| Vendor | Vendor database with auto-learning |

### Workflow Entities
| Entity | Description |
|--------|-------------|
| Voucher | Petty cash voucher lifecycle |
| ApprovalTier | Configurable approval levels |
| ApprovalHistory | Approval audit trail |
| ApprovalDelegation | Delegation of approval authority |
| PreApproval | Pre-approval requests |

### System Entities
| Entity | Description |
|--------|-------------|
| Budget | Budget tracking & enforcement |
| Notification | User notifications |
| AuditLog | Complete audit trail |
| SystemSetting | Configurable settings |

## Key Enums
```prisma
enum UserStatus { PENDING_APPROVAL, ACTIVE, INACTIVE, LOCKED }
enum RoleType { EMPLOYEE, APPROVER, SUPER_APPROVER, FINANCE, CEO, ADMIN }
enum ExpenseStatus { DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, CLARIFICATION_REQUESTED, RESUBMITTED, PAID }
enum VoucherStatus { REQUESTED, APPROVED, REJECTED, DISBURSED, PARTIALLY_SETTLED, SETTLED, OVERDUE }
enum Currency { PKR, GBP, USD, SAR, AED }
enum BudgetEnforcement { HARD_BLOCK, SOFT_WARNING, AUTO_ESCALATE }
```

## Common Patterns

### Self-Referential Hierarchy
```prisma
model Category {
  parentId String?
  parent   Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children Category[] @relation("CategoryHierarchy")
}
```

### Soft Delete Pattern
```prisma
model Entity {
  isActive Boolean @default(true)
}
```

### Decimal for Money
```prisma
amount Decimal @db.Decimal(15, 2)  // 15 total digits, 2 decimal places
```

### Indexes
```prisma
@@index([fieldName])  // Single field
@@index([field1, field2])  // Composite
@@unique([field1, field2])  // Unique composite
```

## Migration Naming Convention
- `add_{entity}_table` - New table
- `add_{field}_to_{entity}` - New column
- `update_{entity}_{change}` - Modification
- `remove_{field}_from_{entity}` - Remove column
