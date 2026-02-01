# Epic 5: Voucher Management

**Priority:** P2 (Important - Phase 2 Frontend)
**Branch:** `feature/epic-05-vouchers`
**Estimated Complexity:** High
**Agent:** frontend-engineer
**Team Size:** 1 frontend engineer

---

## Overview

Implement a complete petty cash voucher management interface allowing employees to request vouchers, approvers to approve/reject them, finance teams to disburse funds, and employees to settle vouchers by linking expenses. This epic includes voucher listing, detailed views, approval workflows, and settlement tracking.

### Dependencies
- **Depends On:** Epic 1 (UI Components), Epic 3 (Expenses) - for expense linking
- **Blocks:** None (parallel with Budgets/Reports)

### Files to Create
```
packages/web/src/
├── features/
│   └── vouchers/
│       ├── services/
│       │   └── vouchers.service.ts (already exists)
│       ├── components/
│       │   ├── VoucherCard.tsx
│       │   ├── VoucherFilters.tsx
│       │   ├── VoucherForm.tsx
│       │   ├── SettlementForm.tsx
│       │   └── VoucherActions.tsx
│       ├── pages/
│       │   ├── VoucherListPage.tsx
│       │   └── VoucherDetailPage.tsx
│       └── types/
│           └── vouchers.types.ts
└── router/
    └── routes.ts (update with voucher routes)
```

---

## Context to Load

```
packages/api/src/modules/vouchers/ (backend API contract)
packages/web/src/features/vouchers/services/vouchers.service.ts (RTK Query setup)
packages/web/src/styles/globals.css (Tailwind classes)
.claude/skills/voucher-management.md (business rules)
packages/web/CLAUDE.md (frontend patterns)
```

---

## Story 5.1: Voucher List Page

Build the main voucher list view with filtering, pagination, and status indicators.

### Context to Load
```
packages/web/src/components/ui/ (DataTable, Badge, Tabs, Pagination)
packages/web/src/features/expenses/pages/ (reference pagination patterns)
```

### Tasks

#### Task 5.1.1: VoucherListPage Component
**File:** `packages/web/src/pages/vouchers/VoucherListPage.tsx`

**Acceptance Criteria:**
- [ ] Page title "Petty Cash Vouchers"
- [ ] Breadcrumb navigation (Dashboard > Vouchers)
- [ ] Status tabs (REQUESTED, APPROVED, REJECTED, DISBURSED, PARTIALLY_SETTLED, SETTLED, OVERDUE) with badge counts
- [ ] Tab switching updates URL and query params
- [ ] Pagination: page, pageSize (default 10, options 10/20/50)
- [ ] Loading state: shows Skeleton components while fetching
- [ ] Empty state: displays EmptyState when no vouchers match filters
- [ ] Error state: displays error message with retry button
- [ ] Role-based visibility:
  - Employees see only their vouchers
  - Finance/Admin see all vouchers
  - Approvers see pending-approval tab
- [ ] "Request New Voucher" button (routes to VoucherRequestPage)
- [ ] Click voucher card navigates to detail page

**Interface:**
```typescript
interface VoucherListPageState {
  selectedStatus: VoucherStatus | 'ALL';
  filters: VoucherFilters & {
    requesterFilter?: string;
    dateRange?: { startDate: Date; endDate: Date };
    amountRange?: { min: number; max: number };
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}

interface VoucherListTabConfig {
  id: VoucherStatus | 'ALL';
  label: string;
  count: number;
  icon: React.ReactNode;
}
```

**Implementation Notes:**
- Use `useGetVouchersQuery(filters)` from vouchersApi
- Manage pagination state with `useState`
- Sync status selection with URL search params using `useSearchParams()`
- Calculate tab counts from paginated response metadata

---

#### Task 5.1.2: VoucherCard Component
**File:** `packages/web/src/features/vouchers/components/VoucherCard.tsx`

**Acceptance Criteria:**
- [ ] Displays voucher number (e.g., "PC-2026-0001")
- [ ] Shows status badge with color coding (green=SETTLED, blue=APPROVED, yellow=PENDING, red=REJECTED/OVERDUE)
- [ ] Displays amount in PKR with proper formatting (e.g., "PKR 25,000")
- [ ] Shows requester name (from requester.firstName + requester.lastName)
- [ ] Shows due date (settlementDeadline) formatted as "dd/MM/yyyy"
- [ ] Urgency indicator:
  - Red background if overdue
  - Yellow background if due within 3 days
  - Gray background if not urgent
- [ ] Shows purpose as subtitle (truncated to 60 chars with ellipsis)
- [ ] Shows disbursed amount if DISBURSED/SETTLED (e.g., "Disbursed: PKR 25,000")
- [ ] Shows total expenses if PARTIALLY_SETTLED/SETTLED (e.g., "Expenses: PKR 18,000")
- [ ] Shows balance/underspend if relevant (e.g., "Balance: PKR 7,000" or "Overspent: PKR 2,000")
- [ ] Clickable: cursor pointer, hover effect with shadow
- [ ] Loading state: Skeleton placeholder

**Interface:**
```typescript
interface VoucherCardProps {
  voucher: Voucher;
  onClick?: (id: string) => void;
  isLoading?: boolean;
}

interface VoucherAmountDisplay {
  label: string;
  amount: number;
  type: 'requested' | 'disbursed' | 'expenses' | 'balance' | 'overspend';
  color?: 'text-green-600' | 'text-red-600' | 'text-gray-600';
}

enum VoucherUrgency {
  OVERDUE = 'overdue',     // red
  DUE_SOON = 'due-soon',   // yellow (< 3 days)
  NORMAL = 'normal',       // gray
}
```

**Implementation Notes:**
- Calculate urgency based on `settlementDeadline` and `status`
- Use Badge component for status
- Format amounts with locale-specific number formatting
- Truncate purpose text safely with CSS or JS

---

#### Task 5.1.3: VoucherFilters Component
**File:** `packages/web/src/features/vouchers/components/VoucherFilters.tsx`

**Acceptance Criteria:**
- [ ] Status filter dropdown (single select) - pre-populated from tabs
- [ ] Date range picker: startDate / endDate for requestedAt
- [ ] Requester filter (autocomplete/searchable select for employees):
  - Only shows if user is Finance/Admin
  - Fetches users as you type
- [ ] Amount range slider: min-max PKR amount:
  - Shows current range as text
  - Only shows if user is Finance/Admin
- [ ] Apply/Reset buttons
- [ ] Filter state persists in URL search params
- [ ] Collapsible section (expandable/collapsible UI)
- [ ] Loading state while applying filters

**Interface:**
```typescript
interface VoucherFiltersProps {
  onApply: (filters: VoucherFilterOptions) => void;
  onReset: () => void;
  defaultFilters?: VoucherFilterOptions;
  userRole: RoleType;
}

interface VoucherFilterOptions {
  status?: VoucherStatus;
  dateRange?: { startDate: Date; endDate: Date };
  requesterFilter?: string;
  amountRange?: { min: number; max: number };
}
```

**Implementation Notes:**
- Use DateRangePicker for date range
- Use Select component with async loading for requester
- Use range input/slider for amount
- Debounce API calls when searching requesters
- Update parent component on Apply
- Clear all filters on Reset

---

## Story 5.2: Voucher Detail Page

Build detailed view showing voucher info, linked expenses, approval timeline, and context-aware actions.

### Context to Load
```
packages/web/src/features/expenses/ (Expense data structures)
packages/web/src/components/ui/Card, Modal, ConfirmDialog, Alert
```

### Tasks

#### Task 5.2.1: VoucherDetailPage Component
**File:** `packages/web/src/pages/vouchers/VoucherDetailPage.tsx`

**Acceptance Criteria:**
- [ ] Route: `/vouchers/:id`
- [ ] Page title shows voucher number (e.g., "Voucher PC-2026-0001")
- [ ] Breadcrumb: Dashboard > Vouchers > VoucherNumber
- [ ] Back button to return to list
- [ ] Main sections:
  1. **Voucher Info Card**: Requester, amount, purpose, dates, status, currency
  2. **Disbursement Info** (if DISBURSED+): Disbursed amount, disbursed date, disburser name
  3. **Linked Expenses Section**: DataTable of expenses linked to voucher
  4. **Settlement History**: Timeline showing approval, disbursement, and settlement events
  5. **Actions Section**: Context-aware action buttons (see Task 5.2.2)
- [ ] Loading state: Skeleton layout while fetching
- [ ] Error state: Error message with retry button
- [ ] Not found state: 404 message
- [ ] Permission check: non-owners can only view their own + Finance/Admin
- [ ] Responsive: Works on mobile (375px) to desktop (1280px)

**Interface:**
```typescript
interface VoucherDetailPageProps {
  // Routes use URL param :id
}

interface VoucherDetailState {
  voucher: Voucher | null;
  linkedExpenses: Expense[];
  approvalHistory: ApprovalHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

interface ApprovalHistoryEntry {
  id: string;
  eventType: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'SETTLED';
  timestamp: Date;
  userId: string;
  userName: string;
  notes?: string;
}

interface VoucherInfoCardProps {
  voucher: Voucher;
}
```

**Implementation Notes:**
- Use `useGetVoucherQuery(id)` to fetch single voucher
- Use `useParams()` to get voucher ID from URL
- Fetch linked expenses separately (via expense API with voucherId filter)
- Build timeline from voucher timestamps and approvalHistory
- Display 404 if voucher not found
- Check user permissions before allowing actions

---

#### Task 5.2.2: Voucher Actions Component
**File:** `packages/web/src/features/vouchers/components/VoucherActions.tsx`

**Acceptance Criteria:**
- [ ] Context-aware button visibility based on status + user role:
  - **REQUESTED status:**
    - Requester: Edit, Delete buttons
    - Approver/Finance/Admin: Approve, Reject buttons
  - **APPROVED status:**
    - Finance/Admin only: Disburse button
  - **DISBURSED status:**
    - Owner: Settle button
    - Finance/Admin: View/Edit button (can adjust settlement deadline if needed)
  - **PARTIALLY_SETTLED status:**
    - Owner: Settle remaining button
  - **SETTLED status:**
    - All: View only (no actions)
  - **REJECTED/CANCELLED status:**
    - All: View only
  - **OVERDUE status:**
    - Owner: Urgent settle button (red styling)
    - Finance/Admin: Contact employee button

- [ ] Action modals:
  - **Approve Modal**: Shows amount field (can modify if needed), submit button
  - **Reject Modal**: Shows reason textarea (required), submit button
  - **Disburse Modal**: Shows final disbursed amount (editable), submit button
  - **Settle Modal**: Routes to SettlementForm (Task 5.2.3)
  - **Delete Confirmation**: ConfirmDialog with warning

- [ ] Action loading states: Button shows spinner while processing
- [ ] Error handling: Shows error toast on failure
- [ ] Success handling: Shows success toast, updates page data
- [ ] Keyboard support: Escape to close modals, Enter to submit

**Interface:**
```typescript
interface VoucherActionsProps {
  voucher: Voucher;
  userRole: RoleType;
  userId: string;
  onActionComplete: () => void; // Re-fetch voucher after action
}

interface ApproveVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { approvedAmount?: number }) => Promise<void>;
  voucherId: string;
  requestedAmount: number;
  isLoading?: boolean;
}

interface RejectVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  voucherId: string;
  isLoading?: boolean;
}

interface DisburseVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (disbursedAmount: number) => Promise<void>;
  voucherId: string;
  requestedAmount: number;
  isLoading?: boolean;
}
```

**Implementation Notes:**
- Use RTK Query mutations: `useApproveVoucherMutation()`, etc.
- Show confirmation dialog before delete
- Validate amounts match business rules (e.g., disburse <= requested)
- Close modal on success
- Re-fetch voucher after successful action
- Show error toast with detailed message

---

#### Task 5.2.3: SettlementForm Component
**File:** `packages/web/src/features/vouchers/components/SettlementForm.tsx`

**Acceptance Criteria:**
- [ ] **Header section:**
  - Shows voucher number
  - Shows status badge

- [ ] **Disbursement Summary Card:**
  - Shows disbursed amount (PKR, formatted)
  - Shows settlement deadline
  - Shows days remaining to deadline (red if overdue, yellow if < 3 days)

- [ ] **Linked Expenses Section:**
  - DataTable showing all PETTY_CASH expenses linked to voucher
  - Columns: Expense date, description, vendor, amount, receipt status
  - Shows total of all linked expenses
  - "Add More Expenses" button to link additional expenses from expense list

- [ ] **Settlement Calculation Section:**
  - Total expenses (sum of linked expenses): displayed in table
  - Balance calculation: disbursed - expenses (auto-calculated)
  - Visual indicator: green if positive (underspend), red if negative (overspend)

- [ ] **Underspend Handling** (balance > 0):
  - Input field: "Cash returned to finance" (read-only, shows balance)
  - Checkbox: "I confirm returning PKR [amount] in cash" (required)
  - Help text: "Unused cash must be returned to Finance"

- [ ] **Overspend Handling** (balance < 0):
  - Alert showing: "Expenses exceed disbursed amount by PKR [overspend]"
  - Textarea: "Overspend justification" (required, min 20 chars)
  - Checkbox: "I request approval for overspend" (required)
  - Help text: "Justify why expenses exceeded the disbursed amount"

- [ ] **Additional Functionality:**
  - "Upload Receipt" button: Opens file upload modal for missing receipts
  - "Link Expense" button: Opens expense selector modal
  - Form validation: All required fields before submit
  - Submit button: "Settle Voucher" (disabled until valid)
  - Cancel button: "Discard Changes"

- [ ] **States:**
  - Loading: Spinner while submitting
  - Success: Shows success toast, redirects to voucher list
  - Error: Shows error alert with details

**Interface:**
```typescript
interface SettlementFormProps {
  voucher: Voucher;
  linkedExpenses: Expense[];
  onSubmit: (data: SettlementFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface SettlementFormData {
  settledAmount: number;
  cashReturned?: number;
  cashReturnConfirmed?: boolean;
  overspendJustification?: string;
  overspendApproved?: boolean;
  linkedExpenseIds: string[];
}

interface SettlementBalance {
  disbursedAmount: number;
  totalExpenses: number;
  balance: number; // positive = underspend, negative = overspend
  balanceType: 'underspend' | 'overspend' | 'zero';
}

interface ExpenseAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExpenses: (expenses: Expense[]) => void;
  voucherId: string;
  alreadyLinkedIds: string[];
}
```

**Implementation Notes:**
- Use React Hook Form for form management
- Use Zod for validation schema
- Calculate balance automatically when expenses change
- Show/hide underspend/overspend sections based on balance
- Link expenses via `useSettleVoucherMutation()`
- Update parent VoucherDetailPage after successful settlement
- Handle partial settlements (can settle multiple times for same voucher)

---

## Story 5.3: Voucher Request Form

Build form for employees to request new petty cash vouchers.

### Context to Load
```
packages/web/src/components/ui/Input, Textarea, DatePicker, Button, Alert
packages/web/src/features/categories/ (for voucher category/purpose if needed)
```

### Tasks

#### Task 5.3.1: VoucherRequestPage Component
**File:** `packages/web/src/pages/vouchers/VoucherRequestPage.tsx`

**Acceptance Criteria:**
- [ ] Route: `/vouchers/request` or `/vouchers/new`
- [ ] Page title: "Request Petty Cash Voucher"
- [ ] Breadcrumb: Dashboard > Vouchers > Request
- [ ] Back button to return to list
- [ ] Single form (VoucherForm component)
- [ ] Submit button label: "Submit Request"
- [ ] Cancel button: Returns to voucher list
- [ ] Post-submit:
  - Shows success toast: "Voucher request submitted successfully"
  - Redirects to VoucherDetailPage for the new voucher
  - Or redirects to VoucherListPage with created voucher highlighted

- [ ] Error handling: Shows error alert with details
- [ ] Loading state: Submit button disabled + spinner while submitting
- [ ] Responsive: Works on mobile (375px) to desktop (1280px)

**Interface:**
```typescript
interface VoucherRequestPageProps {
  // Component receives props from router
}

interface VoucherRequestState {
  isLoading: boolean;
  error: string | null;
  isSubmitted: boolean;
}
```

**Implementation Notes:**
- Use `useCreateVoucherMutation()` from vouchersApi
- Validate form before submission
- Show success modal with voucher number
- Offer option to view details or return to list
- Handle duplicate submission (debounce submit button)

---

#### Task 5.3.2: VoucherForm Component
**File:** `packages/web/src/features/vouchers/components/VoucherForm.tsx`

**Acceptance Criteria:**
- [ ] **Form Fields:**
  1. Requested Amount (number input):
     - Min: 1 PKR
     - Max: 50,000 PKR
     - Shows helper text: "Maximum petty cash limit is PKR 50,000"
     - Shows validation error if exceeds limit
     - Shows validation error if not positive
  2. Purpose (textarea):
     - Min: 10 characters
     - Max: 1,000 characters
     - Shows character count: "X / 1000 characters"
     - Shows validation error if < 10 chars
     - Placeholder: "e.g., Office supplies, team lunch, facility maintenance..."
  3. Expected Settlement Date (date picker):
     - Default: Current date + 7 business days
     - Min date: Today
     - Max date: 30 days from today
     - Label: "Expected Settlement Date"
     - Help text: "When do you plan to settle this voucher?"
  4. Category/Purpose Selector (optional select):
     - Common purposes: Office Supplies, Client Entertainment, Travel, Meals, Other
     - Pre-fills Purpose field when selected
     - Optional (employees can write custom purpose)

- [ ] **Display Elements:**
  - Alert box showing current open vouchers (if any):
    - "You have an open voucher PC-2026-0001 (PKR 25,000) due on 20/02/2026"
    - "Please settle this before requesting a new one"
  - Info box: "Submitted vouchers will be reviewed by your approver"
  - Estimated approval time: "Typically approved within 1-2 business days"

- [ ] **Form Behavior:**
  - Validation on blur (field-level)
  - Validation on submit (form-level)
  - Disable submit button if form invalid
  - Show loading spinner in submit button while submitting
  - Clear form on successful submission (if used in modal) or stay for editing

- [ ] **TypeScript Validation:**
  - Zod schema for form data
  - Type-safe form handling with React Hook Form

**Interface:**
```typescript
interface VoucherFormProps {
  initialData?: CreateVoucherDto;
  onSubmit: (data: CreateVoucherDto) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  openVouchers?: Voucher[]; // To show warning
}

interface VoucherFormData extends CreateVoucherDto {
  settlementDeadline?: string; // ISO date string
}

interface VoucherPurposeCategory {
  value: string;
  label: string;
  defaultText: string;
}

const VOUCHER_PURPOSE_CATEGORIES: VoucherPurposeCategory[] = [
  { value: 'office-supplies', label: 'Office Supplies', defaultText: 'Office supplies and stationery' },
  { value: 'meals', label: 'Meals & Refreshments', defaultText: 'Team meals and refreshments' },
  { value: 'travel', label: 'Travel & Transport', defaultText: 'Local travel and transport expenses' },
  { value: 'entertainment', label: 'Client Entertainment', defaultText: 'Client entertainment and hospitality' },
  { value: 'other', label: 'Other', defaultText: '' },
];

// Zod schema
const voucherFormSchema = z.object({
  requestedAmount: z
    .number()
    .min(1, 'Amount must be at least PKR 1')
    .max(50000, 'Maximum petty cash limit is PKR 50,000'),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(1000, 'Purpose cannot exceed 1000 characters'),
  settlementDeadline: z.string().optional(),
});

type VoucherFormSchema = z.infer<typeof voucherFormSchema>;
```

**Implementation Notes:**
- Use React Hook Form + Zod for validation
- Use Input for amount (type="number")
- Use Textarea for purpose with character count
- Use DatePicker for settlement deadline
- Use Select for purpose category
- Calculate default settlement deadline as today + 7 days
- Show warning if user already has open voucher
- Debounce form submissions to prevent duplicates
- Reset form after successful submission or on cancel

---

## TypeScript Interfaces

### Voucher Entity
```typescript
// Location: packages/web/src/features/vouchers/types/vouchers.types.ts

export type VoucherStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'DISBURSED'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'OVERDUE'
  | 'REJECTED';

export interface Voucher {
  id: string;
  voucherNumber: string;
  status: VoucherStatus;
  requesterId: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
  };
  currency: string;
  requestedAmount: number;
  approvedAmount?: number;
  disbursedAmount?: number;
  settledAmount?: number;
  purpose: string;
  notes?: string;
  requestedAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  settlementDeadline?: string;
  settledAt?: string;
  underSpendAmount?: number;
  overSpendAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherFilters {
  page?: number;
  pageSize?: number;
  status?: VoucherStatus;
}

export interface CreateVoucherDto {
  requestedAmount: number;
  currency?: string;
  purpose: string;
  notes?: string;
}

export interface VoucherStatusBadgeConfig {
  status: VoucherStatus;
  label: string;
  bgColor: string; // Tailwind class
  textColor: string; // Tailwind class
  icon: React.ReactNode;
}

export interface VoucherListState {
  selectedStatus: VoucherStatus | 'ALL';
  filters: VoucherFilters & {
    requesterFilter?: string;
    dateRange?: { startDate: Date; endDate: Date };
    amountRange?: { min: number; max: number };
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}

export const VOUCHER_STATUS_CONFIG: Record<VoucherStatus, VoucherStatusBadgeConfig> = {
  REQUESTED: {
    status: 'REQUESTED',
    label: 'Pending Approval',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: '⏳',
  },
  APPROVED: {
    status: 'APPROVED',
    label: 'Approved',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: '✓',
  },
  DISBURSED: {
    status: 'DISBURSED',
    label: 'Disbursed',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: '💰',
  },
  PARTIALLY_SETTLED: {
    status: 'PARTIALLY_SETTLED',
    label: 'Partially Settled',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: '⚠',
  },
  SETTLED: {
    status: 'SETTLED',
    label: 'Settled',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: '✓',
  },
  OVERDUE: {
    status: 'OVERDUE',
    label: 'Overdue',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: '🔴',
  },
  REJECTED: {
    status: 'REJECTED',
    label: 'Rejected',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: '✗',
  },
};

export const VOUCHER_ROUTES = {
  LIST: '/vouchers',
  REQUEST: '/vouchers/request',
  DETAIL: (id: string) => `/vouchers/${id}`,
};
```

---

## Routing Configuration

Add to `packages/web/src/router/routes.tsx`:

```typescript
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const VoucherListPage = lazy(() => import('@/pages/vouchers/VoucherListPage'));
const VoucherDetailPage = lazy(() => import('@/pages/vouchers/VoucherDetailPage'));
const VoucherRequestPage = lazy(() => import('@/pages/vouchers/VoucherRequestPage'));

export const voucherRoutes: RouteObject[] = [
  {
    path: 'vouchers',
    children: [
      {
        index: true,
        element: <VoucherListPage />,
        handle: { breadcrumb: 'Petty Cash Vouchers', requireAuth: true },
      },
      {
        path: 'request',
        element: <VoucherRequestPage />,
        handle: { breadcrumb: 'Request Voucher', requireAuth: true },
      },
      {
        path: ':id',
        element: <VoucherDetailPage />,
        handle: { breadcrumb: 'Voucher Details', requireAuth: true },
      },
    ],
  },
];
```

---

## Testing Requirements

### Component Tests Required

#### VoucherCard Tests
```typescript
// packages/web/src/features/vouchers/components/__tests__/VoucherCard.test.tsx

describe('VoucherCard', () => {
  it('should render voucher number, amount, and status badge');
  it('should display requester name');
  it('should show due date with urgency indicator');
  it('should highlight overdue vouchers in red');
  it('should highlight due-soon vouchers (< 3 days) in yellow');
  it('should be clickable and call onClick handler');
  it('should show loading skeleton when isLoading=true');
  it('should format amounts with PKR currency');
  it('should truncate long purpose text');
  it('should display disbursed and expenses amounts when relevant');
});
```

#### VoucherListPage Tests
```typescript
// packages/web/src/pages/vouchers/__tests__/VoucherListPage.test.tsx

describe('VoucherListPage', () => {
  it('should render page title and breadcrumb');
  it('should render status tabs with counts');
  it('should render voucher list with pagination');
  it('should filter vouchers by status when tab clicked');
  it('should handle pagination page changes');
  it('should show loading state while fetching');
  it('should show empty state when no vouchers');
  it('should show error state with retry button');
  it('should navigate to detail page when voucher clicked');
  it('should navigate to request page when "Request New" clicked');
  it('should apply additional filters and update URL');
});
```

#### VoucherForm Tests
```typescript
// packages/web/src/features/vouchers/components/__tests__/VoucherForm.test.tsx

describe('VoucherForm', () => {
  it('should render all form fields');
  it('should validate amount is positive');
  it('should validate amount <= 50000');
  it('should validate purpose >= 10 characters');
  it('should show character count for purpose');
  it('should update settlement date in DatePicker');
  it('should populate form from category selection');
  it('should show warning if user has open voucher');
  it('should disable submit button if form invalid');
  it('should submit form with correct data');
  it('should handle form submission errors');
});
```

#### SettlementForm Tests
```typescript
// packages/web/src/features/vouchers/components/__tests__/SettlementForm.test.tsx

describe('SettlementForm', () => {
  it('should display disbursement summary');
  it('should list linked expenses in DataTable');
  it('should calculate and display balance');
  it('should show underspend section when balance > 0');
  it('should show overspend section when balance < 0');
  it('should require cash return confirmation for underspend');
  it('should require overspend justification for overspend');
  it('should allow linking additional expenses');
  it('should validate settlement form before submit');
  it('should submit settlement with correct data');
  it('should show success/error states');
});
```

#### VoucherDetailPage Tests
```typescript
// packages/web/src/pages/vouchers/__tests__/VoucherDetailPage.test.tsx

describe('VoucherDetailPage', () => {
  it('should render voucher details');
  it('should display voucher info card');
  it('should display disbursement info when disbursed');
  it('should display linked expenses section');
  it('should display approval timeline');
  it('should show context-aware action buttons');
  it('should allow approving/rejecting vouchers (approver role)');
  it('should allow disbursing vouchers (finance role)');
  it('should allow settling vouchers (owner role)');
  it('should show 404 when voucher not found');
  it('should enforce permission checks');
});
```

### Coverage Target
- Minimum 80% code coverage for voucher features
- All user interactions tested
- All error scenarios tested
- All role-based visibility tested

### Test Utilities
```typescript
// Test helpers for voucher tests
export const mockVouchers: Voucher[] = [
  {
    id: '1',
    voucherNumber: 'PC-2026-0001',
    status: 'REQUESTED',
    requesterId: 'user-1',
    requester: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
    currency: 'PKR',
    requestedAmount: 25000,
    purpose: 'Office supplies and stationery for team',
    requestedAt: '2026-02-01T10:00:00Z',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  // ... more mocks
];

export const mockVoucherResponse = {
  data: mockVouchers,
  meta: {
    pagination: { page: 1, pageSize: 10, total: 5, totalPages: 1 },
  },
};
```

---

## Definition of Done

- [ ] All 7 components implemented (VoucherListPage, VoucherCard, VoucherFilters, VoucherDetailPage, VoucherForm, SettlementForm, VoucherActions)
- [ ] All TypeScript interfaces defined and exported
- [ ] Routing configured in routes.tsx
- [ ] RTK Query hooks properly integrated
- [ ] Form validation with React Hook Form + Zod
- [ ] Status tabs with correct filtering
- [ ] Pagination working correctly
- [ ] Loading states (Skeleton) for all async operations
- [ ] Error states with retry mechanisms
- [ ] Role-based visibility enforced
- [ ] Empty states displayed appropriately
- [ ] Currency formatting (PKR) consistent across app
- [ ] Date formatting consistent (dd/MM/yyyy)
- [ ] Responsive design at all breakpoints (mobile, tablet, desktop)
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] Component tests written with >80% coverage
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All components use Tailwind CSS (no inline styles)
- [ ] Manual testing completed (create, approve, disburse, settle flow)
- [ ] E2E tests passing (if applicable)

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-05-vouchers
```

### Commits (one per story)
```bash
# Story 5.1
git commit -m "feat(vouchers): add voucher list page with filters and pagination

- VoucherListPage with status tabs and pagination
- VoucherCard component with urgency indicators
- VoucherFilters component with date range and amount filtering

Task: 5.1.1-5.1.3"

# Story 5.2
git commit -m "feat(vouchers): add voucher detail page and actions

- VoucherDetailPage with info, expenses, and timeline
- VoucherActions component with approve/reject/disburse modals
- SettlementForm component with balance handling and receipt uploads

Task: 5.2.1-5.2.3"

# Story 5.3
git commit -m "feat(vouchers): add voucher request form

- VoucherRequestPage for new voucher creation
- VoucherForm component with amount, purpose, and date fields
- Form validation with Zod schema

Task: 5.3.1-5.3.2"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-05-vouchers",
  "feature_name": "Voucher Management",
  "module_name": "vouchers",

  "api_contracts": {
    "base_url": "/api/v1",
    "service_file": "packages/web/src/features/vouchers/services/vouchers.service.ts",
    "endpoints": [
      "GET /vouchers",
      "GET /vouchers/:id",
      "POST /vouchers",
      "POST /vouchers/:id/approve",
      "POST /vouchers/:id/reject",
      "POST /vouchers/:id/disburse",
      "POST /vouchers/:id/settle",
      "DELETE /vouchers/:id"
    ]
  },

  "pages_required": [
    "VoucherListPage",
    "VoucherDetailPage",
    "VoucherRequestPage"
  ],

  "components_required": [
    "VoucherCard",
    "VoucherFilters",
    "VoucherForm",
    "SettlementForm",
    "VoucherActions"
  ],

  "dependencies": {
    "blocking": ["epic-01-ui-components"],
    "optional": ["epic-03-expenses"]
  },

  "constraints": {
    "must_use": [
      "RTK Query for API calls",
      "React Hook Form for forms",
      "Zod for validation",
      "Tailwind CSS for styling",
      "TypeScript interfaces"
    ],
    "must_not": [
      "Create new form components (use existing UI library from Epic 1)",
      "Use inline styles",
      "Use any types",
      "Hardcode API URLs",
      "Skip loading/error states"
    ]
  },

  "business_rules_file": ".claude/skills/voucher-management.md",
  "api_module_file": "packages/api/src/modules/vouchers/CLAUDE.md",

  "test_requirements": {
    "minimum_coverage": 80,
    "include_e2e": false,
    "test_utils_provided": true
  },

  "context_files": [
    "packages/web/src/features/vouchers/services/vouchers.service.ts",
    "packages/web/src/components/ui/",
    "packages/web/src/styles/globals.css",
    "packages/api/src/modules/vouchers/",
    ".claude/skills/voucher-management.md",
    "packages/web/CLAUDE.md"
  ]
}
```

---

## Implementation Notes

### Styling Guidelines
- Use existing Tailwind classes from `globals.css`
- Badge variants: success (green), warning (yellow), danger (red), info (blue), neutral (gray)
- Status colors:
  - REQUESTED: blue
  - APPROVED: green
  - DISBURSED: purple
  - PARTIALLY_SETTLED: yellow
  - SETTLED: green
  - OVERDUE: red
  - REJECTED: red

### Amount Formatting
```typescript
// In all components displaying amounts
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Usage: PKR 25,000 (not PKR 25,000.00)
```

### Date Formatting
```typescript
// Format dates as dd/MM/yyyy
import { format } from 'date-fns';
const formatted = format(new Date(dateString), 'dd/MM/yyyy');
```

### Role-Based Visibility Patterns
```typescript
// Check user role in components
const canApprove = [RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN].includes(userRole);
const canDisburse = [RoleType.FINANCE, RoleType.ADMIN].includes(userRole);
const isOwner = voucher.requesterId === userId;

// Conditionally render actions
{canApprove && <ApproveButton />}
{canDisburse && <DisburseButton />}
{isOwner && <SettleButton />}
```

### Error Handling Strategy
```typescript
// All API errors should be caught and displayed
try {
  await approveVoucher({ id, approvedAmount }).unwrap();
  toast.success('Voucher approved successfully');
  refetchVoucher();
} catch (error) {
  const message = error?.data?.message || 'Failed to approve voucher';
  toast.error(message);
}
```

---

## Known Constraints & Decisions

1. **Settlement Deadline Format**: Uses ISO date string (e.g., "2026-02-08T00:00:00Z")
2. **Currency**: All amounts are in PKR, hardcoded in display
3. **Pagination**: Default page size 10, options: 10, 20, 50
4. **Expense Linking**: Only PETTY_CASH type expenses can be linked (handled by backend)
5. **Settlement Workflow**: Can settle multiple times (PARTIALLY_SETTLED state)
6. **Overspend Approval**: Justification required but actual approval is backend responsibility
7. **Date Range Filter**: Uses settledAt for historical view, can be extended

---

## Additional Context

### Business Rules (from .claude/skills/voucher-management.md)
- Maximum petty cash amount: PKR 50,000
- Settlement deadline: 7 business days from disbursement
- Purpose minimum length: 10 characters
- Cannot have multiple open vouchers per user
- Overspend requires justification
- Underspend requires cash return confirmation

### API Response Format
All API responses follow pagination format:
```typescript
{
  data: Voucher[],
  meta: {
    pagination: {
      page: number,
      pageSize: number,
      total: number,
      totalPages: number
    }
  }
}
```

### RTK Query Cache Invalidation
Voucher actions (approve, disburse, settle, etc.) invalidate the `Voucher` tag, causing automatic re-fetch of voucher lists and details.

### State Management
- Use RTK Query for server state (vouchers, expenses)
- Use local state (useState) for UI state (filters, pagination, modals)
- Redux for auth state (user role checks)

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [.claude/skills/voucher-management.md](./../skills/voucher-management.md) | Business rules and workflows |
| [packages/api/src/modules/vouchers/CLAUDE.md](../../packages/api/src/modules/vouchers/CLAUDE.md) | Backend API contract |
| [packages/web/CLAUDE.md](../../packages/web/CLAUDE.md) | Frontend patterns |
| [.claude/tasks/epic-01-ui-components.md](./epic-01-ui-components.md) | UI component library |
| [.claude/tasks/epic-03-expenses.md](./epic-03-expenses.md) | Expense domain (for linking) |
