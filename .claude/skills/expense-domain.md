# Skill: Expense Domain

## Context
This skill contains the business rules, data models, and domain logic for the expense management system. Reference this when implementing any expense-related functionality.

---

## Core Concepts

### Expense Types
| Type | Description | Flow |
|------|-------------|------|
| **Out-of-Pocket** | Employee pays with personal funds | Submit → Approve → Reimburse |
| **Petty Cash** | Employee uses company-disbursed cash | Request → Disburse → Spend → Settle |

### Expense Lifecycle

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│  DRAFT  │───►│ PENDING │───►│ APPROVED │───►│ SETTLED  │
└─────────┘    └─────────┘    └──────────┘    └──────────┘
     │              │               │
     │              │               │
     ▼              ▼               ▼
┌─────────┐    ┌──────────┐   ┌──────────┐
│ DELETED │    │ REJECTED │   │REIMBURSED│
└─────────┘    └──────────┘   └──────────┘
                    │
                    ▼
              ┌───────────┐
              │RESUBMITTED│ (goes back to PENDING)
              └───────────┘
```

### Status Definitions

| Status | Description | Allowed Actions |
|--------|-------------|-----------------|
| `DRAFT` | Started but not submitted | Edit, Delete, Submit |
| `PENDING_APPROVAL` | Awaiting approver action | View only (by submitter) |
| `CLARIFICATION_REQUESTED` | Returned for more info | Edit, Resubmit |
| `APPROVED` | Fully approved | None (by submitter) |
| `REJECTED` | Denied | Edit, Resubmit |
| `SETTLED` | Reimbursement processed | View only |

---

## Business Rules

### Expense Creation Rules

```typescript
// Rule 1: Amount must be positive
if (amount <= 0) {
  throw new BadRequestException('Amount must be positive');
}

// Rule 2: Date cannot be in the future
if (expenseDate > today) {
  throw new BadRequestException('Expense date cannot be in the future');
}

// Rule 3: Currency must be supported
const SUPPORTED_CURRENCIES = ['PKR', 'USD', 'GBP', 'SAR', 'AED'];
if (!SUPPORTED_CURRENCIES.includes(currency)) {
  throw new BadRequestException(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`);
}

// Rule 4: Category is required
if (!categoryId) {
  throw new BadRequestException('Category is required');
}
```

### Submission Rules

```typescript
// Rule 1: Must have at least one receipt to submit (unless exempt category)
const RECEIPT_EXEMPT_CATEGORIES = ['per_diem', 'mileage'];
if (!isReceiptExempt && receipts.length === 0) {
  throw new BadRequestException('At least one receipt is required to submit');
}

// Rule 2: Submission deadline (configurable, default 10 days)
const SUBMISSION_DEADLINE_DAYS = 10;
const daysSinceExpense = differenceInDays(today, expenseDate);
if (daysSinceExpense > SUBMISSION_DEADLINE_DAYS) {
  // Allow with flag, requires justification
  expense.isLateSubmission = true;
  expense.lateSubmissionReason = dto.lateReason;
}

// Rule 3: Cannot submit if linked voucher is not disbursed
if (expense.voucherId) {
  const voucher = await this.prisma.voucher.findUnique({ where: { id: expense.voucherId } });
  if (voucher.status !== VoucherStatus.DISBURSED) {
    throw new BadRequestException('Linked voucher must be disbursed before submitting expenses');
  }
}

// Rule 4: Pre-approval required for certain categories
if (category.requiresPreApproval && !expense.preApprovalId) {
  throw new BadRequestException(`Pre-approval required for ${category.name} expenses`);
}
```

### Edit Rules

```typescript
// Rule 1: Can only edit DRAFT or CLARIFICATION_REQUESTED expenses
const EDITABLE_STATUSES = [ExpenseStatus.DRAFT, ExpenseStatus.CLARIFICATION_REQUESTED];
if (!EDITABLE_STATUSES.includes(expense.status)) {
  throw new ForbiddenException('Cannot edit expense in current status');
}

// Rule 2: Only owner can edit
if (expense.userId !== currentUser.id && !currentUser.isAdmin) {
  throw new ForbiddenException('You can only edit your own expenses');
}
```

### Deletion Rules

```typescript
// Rule 1: Can only delete DRAFT expenses
if (expense.status !== ExpenseStatus.DRAFT) {
  throw new ForbiddenException('Only draft expenses can be deleted');
}

// Rule 2: Soft delete for audit trail
await this.prisma.expense.update({
  where: { id: expense.id },
  data: { deletedAt: new Date() },
});
```

---

## Data Models

### Expense Entity

```typescript
interface Expense {
  // Identity
  id: string;                    // UUID

  // Ownership
  userId: string;                // Who created this
  departmentId: string;          // Auto from user

  // Type & Source
  expenseType: 'OUT_OF_POCKET' | 'PETTY_CASH';
  voucherId?: string;            // If petty cash, link to voucher
  preApprovalId?: string;        // If pre-approval was required

  // Financial
  originalAmount: number;        // Amount in original currency
  originalCurrency: string;      // PKR, USD, GBP, etc.
  exchangeRate: number;          // Rate at submission time
  exchangeRateTimestamp: Date;   // When rate was captured
  pkrAmount: number;             // Converted to base currency

  // Tax
  taxType?: string;              // GST, VAT, etc.
  taxAmount?: number;
  netAmount?: number;

  // Categorization
  categoryId: string;
  projectId?: string;
  costCenterId?: string;
  budgetId?: string;

  // Details
  vendorId?: string;
  expenseDate: Date;
  description?: string;

  // Special Types
  isMileage: boolean;
  mileageDetails?: MileageDetails;
  isPerDiem: boolean;
  perDiemDetails?: PerDiemDetails;

  // Status
  status: ExpenseStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  settledAt?: Date;

  // Flags
  isLateSubmission: boolean;
  lateSubmissionReason?: string;
  isDuplicate: boolean;
  duplicateOf?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Relations
  receipts: Receipt[];
  attachments: Attachment[];
  approvalHistory: ApprovalHistory[];
  comments: Comment[];
  splits?: ExpenseSplit[];
}
```

### Receipt Entity

```typescript
interface Receipt {
  id: string;
  expenseId: string;

  // File
  filePath: string;              // S3 path
  fileType: string;              // image/jpeg, application/pdf
  fileSize: number;              // bytes
  originalFileName: string;

  // OCR Data
  ocrProcessed: boolean;
  ocrConfidence: number;         // 0-100
  ocrData: {
    vendorName?: string;
    vendorAddress?: string;
    receiptNumber?: string;
    invoiceNumber?: string;
    date?: string;
    totalAmount?: number;
    currency?: string;
    taxAmount?: number;
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      amount: number;
    }>;
  };

  // Audit
  createdAt: Date;
}
```

### Expense Split Entity

```typescript
interface ExpenseSplit {
  id: string;
  expenseId: string;

  // Allocation
  categoryId: string;
  projectId?: string;
  costCenterId?: string;

  // Amount
  amount: number;                // Must sum to expense total
  percentage?: number;           // Optional, for display

  description?: string;

  createdAt: Date;
}
```

---

## Expense Categories

### Default Categories

```typescript
const DEFAULT_CATEGORIES = [
  // Travel
  { code: 'AIRFARE', name: 'Airfare', group: 'Travel', requiresPreApproval: true },
  { code: 'HOTEL', name: 'Hotel/Lodging', group: 'Travel', requiresPreApproval: true },
  { code: 'GROUND_TRANSPORT', name: 'Ground Transport', group: 'Travel', requiresPreApproval: false },
  { code: 'MILEAGE', name: 'Mileage', group: 'Travel', requiresPreApproval: false, receiptExempt: true },
  { code: 'PARKING', name: 'Parking & Tolls', group: 'Travel', requiresPreApproval: false },

  // Meals
  { code: 'WORKING_MEAL', name: 'Working Meals', group: 'Meals', requiresPreApproval: false },
  { code: 'CLIENT_ENTERTAINMENT', name: 'Client Entertainment', group: 'Meals', requiresPreApproval: true },
  { code: 'TEAM_MEAL', name: 'Team Meals', group: 'Meals', requiresPreApproval: false },

  // Office
  { code: 'OFFICE_SUPPLIES', name: 'Office Supplies', group: 'Office', requiresPreApproval: false },
  { code: 'SOFTWARE', name: 'Software Subscriptions', group: 'Office', requiresPreApproval: true },
  { code: 'EQUIPMENT', name: 'Equipment/Hardware', group: 'Office', requiresPreApproval: true },
  { code: 'PRINTING', name: 'Printing & Courier', group: 'Office', requiresPreApproval: false },

  // Professional
  { code: 'TRAINING', name: 'Training & Certifications', group: 'Professional', requiresPreApproval: true },
  { code: 'CONFERENCE', name: 'Conference Fees', group: 'Professional', requiresPreApproval: true },
  { code: 'BOOKS', name: 'Books & Subscriptions', group: 'Professional', requiresPreApproval: false },

  // Other
  { code: 'COMMUNICATION', name: 'Communication', group: 'Miscellaneous', requiresPreApproval: false },
  { code: 'VISA', name: 'Visa & Documentation', group: 'Miscellaneous', requiresPreApproval: false },
  { code: 'PER_DIEM', name: 'Per Diem', group: 'Miscellaneous', requiresPreApproval: false, receiptExempt: true },
  { code: 'OTHER', name: 'Other', group: 'Miscellaneous', requiresPreApproval: false },
];
```

---

## Currency Handling

### Exchange Rate Capture

```typescript
async function captureExchangeRate(
  fromCurrency: string,
  toCurrency: string = 'PKR'
): Promise<{ rate: number; timestamp: Date }> {
  // Fetch from exchange rate API
  const response = await this.exchangeRateApi.getRate(fromCurrency, toCurrency);

  // Store in database for audit
  const rateRecord = await this.prisma.exchangeRate.create({
    data: {
      fromCurrency,
      toCurrency,
      rate: response.rate,
      capturedAt: new Date(),
    },
  });

  return {
    rate: response.rate,
    timestamp: rateRecord.capturedAt,
  };
}

// Usage when creating expense
const { rate, timestamp } = await captureExchangeRate(dto.currency);
expense.exchangeRate = rate;
expense.exchangeRateTimestamp = timestamp;
expense.pkrAmount = dto.amount * rate;
```

### Supported Currencies

```typescript
const CURRENCIES = {
  PKR: { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs.', decimals: 2 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
};
```

---

## Tax Handling

### Tax Types

```typescript
const TAX_TYPES = {
  // Pakistan
  SINDH_GST: { code: 'SINDH_GST', name: 'Sindh Sales Tax', rate: 0.13 },
  PUNJAB_GST: { code: 'PUNJAB_GST', name: 'Punjab Sales Tax', rate: 0.16 },
  KPK_GST: { code: 'KPK_GST', name: 'KPK Sales Tax', rate: 0.15 },
  BALOCHISTAN_GST: { code: 'BALOCHISTAN_GST', name: 'Balochistan Sales Tax', rate: 0.15 },
  FEDERAL_GST: { code: 'FEDERAL_GST', name: 'Federal GST', rate: 0.17 },

  // International
  UK_VAT: { code: 'UK_VAT', name: 'UK VAT', rate: 0.20 },
  UAE_VAT: { code: 'UAE_VAT', name: 'UAE VAT', rate: 0.05 },
  SAUDI_VAT: { code: 'SAUDI_VAT', name: 'Saudi VAT', rate: 0.15 },

  // Exempt
  EXEMPT: { code: 'EXEMPT', name: 'Tax Exempt', rate: 0 },
};
```

---

## Duplicate Detection

### Detection Logic

```typescript
async function checkForDuplicates(expense: CreateExpenseDto, userId: string): Promise<DuplicateCheckResult> {
  const duplicates: PotentialDuplicate[] = [];

  // Check 1: Same amount + date + vendor (within 24 hours)
  const amountDateMatch = await this.prisma.expense.findMany({
    where: {
      userId,
      originalAmount: expense.amount,
      originalCurrency: expense.currency,
      expenseDate: {
        gte: subHours(expense.expenseDate, 24),
        lte: addHours(expense.expenseDate, 24),
      },
      vendorId: expense.vendorId,
      id: expense.id ? { not: expense.id } : undefined, // Exclude self if editing
    },
  });

  if (amountDateMatch.length > 0) {
    duplicates.push({
      type: 'AMOUNT_DATE_VENDOR',
      confidence: 0.9,
      matches: amountDateMatch.map(e => e.id),
    });
  }

  // Check 2: Receipt image hash (if receipt provided)
  if (expense.receiptHash) {
    const hashMatch = await this.prisma.receipt.findMany({
      where: { imageHash: expense.receiptHash },
    });

    if (hashMatch.length > 0) {
      duplicates.push({
        type: 'RECEIPT_IMAGE',
        confidence: 0.95,
        matches: hashMatch.map(r => r.expenseId),
      });
    }
  }

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
    highestConfidence: Math.max(...duplicates.map(d => d.confidence), 0),
  };
}
```

---

## Mileage Calculation

```typescript
interface MileageDetails {
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  vehicleType: 'CAR' | 'MOTORCYCLE';
  ratePerKm: number;
  calculatedAmount: number;
  calculationMethod: 'MANUAL' | 'MAPS_API';
}

async function calculateMileageExpense(details: MileageInput): Promise<MileageDetails> {
  // Get current rate for vehicle type
  const rate = await this.prisma.mileageRate.findFirst({
    where: { vehicleType: details.vehicleType, effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
  });

  let distance = details.distanceKm;
  let method: 'MANUAL' | 'MAPS_API' = 'MANUAL';

  // Calculate via maps if addresses provided
  if (details.startAddress && details.endAddress) {
    const mapsResult = await this.mapsService.getDistance(
      details.startAddress,
      details.endAddress
    );
    distance = mapsResult.distanceKm;
    method = 'MAPS_API';
  }

  return {
    startLocation: details.startLocation || details.startAddress,
    endLocation: details.endLocation || details.endAddress,
    distanceKm: distance,
    vehicleType: details.vehicleType,
    ratePerKm: rate.ratePerKm,
    calculatedAmount: distance * rate.ratePerKm,
    calculationMethod: method,
  };
}
```

---

## Per Diem Calculation

```typescript
interface PerDiemDetails {
  destination: string;
  destinationType: 'DOMESTIC' | 'INTERNATIONAL';
  numberOfDays: number;
  dailyRate: number;
  calculatedAmount: number;
  mealsIncluded: boolean;
}

async function calculatePerDiem(details: PerDiemInput): Promise<PerDiemDetails> {
  // Get rate for destination
  const rate = await this.prisma.perDiemRate.findFirst({
    where: {
      destinationType: details.destinationType,
      destinationName: details.destination,
      effectiveTo: null,
    },
  });

  // Fall back to default rate if specific not found
  const dailyRate = rate?.dailyRate ||
    (details.destinationType === 'DOMESTIC' ? 3000 : 10000); // PKR

  return {
    destination: details.destination,
    destinationType: details.destinationType,
    numberOfDays: details.numberOfDays,
    dailyRate,
    calculatedAmount: details.numberOfDays * dailyRate,
    mealsIncluded: true,
  };
}
```

---

## Error Messages

Use consistent, user-friendly error messages:

```typescript
const EXPENSE_ERRORS = {
  NOT_FOUND: 'Expense not found',
  NOT_OWNER: 'You can only access your own expenses',
  CANNOT_EDIT: 'Cannot edit expense in current status',
  CANNOT_DELETE: 'Only draft expenses can be deleted',
  CANNOT_SUBMIT: 'Cannot submit expense in current status',
  RECEIPT_REQUIRED: 'At least one receipt is required to submit',
  PRE_APPROVAL_REQUIRED: 'Pre-approval is required for this expense category',
  BUDGET_EXCEEDED: 'This expense would exceed the allocated budget',
  INVALID_AMOUNT: 'Amount must be a positive number',
  INVALID_DATE: 'Expense date cannot be in the future',
  INVALID_CURRENCY: 'Currency is not supported',
  DUPLICATE_DETECTED: 'A similar expense already exists',
  VOUCHER_NOT_DISBURSED: 'Linked voucher must be disbursed before submitting expenses',
};
```
