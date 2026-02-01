# Epic 3: Expense Management

**Priority:** P1 (Critical)
**Branch:** `feature/epic-03-expenses`
**Estimated Complexity:** High
**Agent:** frontend-engineer

---

## Overview

Implement a comprehensive expense management system with list, create/edit, and detail pages. This epic provides core functionality for users to submit expenses, manage receipts, split expenses, and track their approval status. All pages integrate with real backend APIs for expenses, receipts, and approval workflows.

### Dependencies
- **Depends On:** Epic 1 (Stories 1.1, 1.2, 1.3, 1.4) - Requires Input, Select, DatePicker, FileUpload, DataTable, Card, Badge, Modal, and other UI components
- **Blocks:** Epic 4 (Approvals), Epic 7 (Reports)

### Backend API Integration
Uses `expensesApi` from `packages/web/src/features/expenses/services/expenses.service.ts`:
- Endpoint: `GET /expenses` - List expenses with pagination and filtering
- Endpoint: `POST /expenses` - Create new expense
- Endpoint: `GET /expenses/{id}` - Get expense detail
- Endpoint: `PUT /expenses/{id}` - Update expense
- Endpoint: `DELETE /expenses/{id}` - Delete expense
- Endpoint: `POST /expenses/{id}/submit` - Submit for approval
- Endpoint: `POST /expenses/{id}/withdraw` - Withdraw submitted expense
- Endpoint: `POST /receipts/upload` - Upload receipt files

Additional APIs needed:
- `categoriesApi.getCategories` - Hierarchical categories for form dropdown
- `vendorsApi.getVendors` - Vendor autocomplete
- `approvalsApi.getApprovalHistory` - Approval timeline on detail page

### Files to Create/Update
```
packages/web/src/
├── pages/expenses/
│   ├── ExpenseListPage.tsx (NEW)
│   ├── ExpenseCreatePage.tsx (NEW)
│   ├── ExpenseEditPage.tsx (NEW)
│   └── ExpenseDetailPage.tsx (NEW)
├── components/expenses/
│   ├── ExpenseCard.tsx (NEW)
│   ├── ExpenseListView.tsx (NEW)
│   ├── ExpenseGridView.tsx (NEW)
│   ├── ViewToggle.tsx (NEW)
│   ├── ExpenseFilters.tsx (NEW)
│   ├── BulkActions.tsx (NEW)
│   ├── ExpenseForm.tsx (NEW)
│   ├── ReceiptUpload.tsx (NEW)
│   ├── ExpenseSplits.tsx (NEW)
│   ├── ExpenseDetailInfo.tsx (NEW)
│   ├── ReceiptGallery.tsx (NEW)
│   ├── ApprovalTimeline.tsx (NEW)
│   ├── ExpenseActions.tsx (NEW)
│   └── index.ts (barrel export)
├── features/expenses/services/
│   └── expenses.service.ts (UPDATE - add missing endpoints)
└── hooks/
    └── useExpenseFilters.ts (NEW - URL sync for filters)
```

---

## Story 3.1: Expense List Page

Implement a feature-rich expense list page with real API integration, filtering, sorting, bulk actions, and view toggles.

### Context to Load
```
packages/web/src/pages/expenses/ (existing structure)
packages/web/src/features/expenses/services/expenses.service.ts (RTK Query service)
packages/api/src/modules/expenses/dto/*.ts (Expense DTOs)
packages/web/src/components/ui/ (Card, Badge, DataTable, Skeleton, etc.)
packages/web/src/store/hooks.ts (useAppDispatch, useAppSelector)
```

### Tasks

#### Task 3.1.1: Integrate Expenses API
**Files:**
- `packages/web/src/features/expenses/services/expenses.service.ts` (UPDATE)
- `packages/web/src/pages/expenses/ExpenseListPage.tsx` (UPDATE)

**Acceptance Criteria:**
- [ ] Add `getExpenses` endpoint to expensesApi with pagination and filtering support
- [ ] Endpoint parameters: page, pageSize, status[], dateFrom, dateTo, categoryId, amountMin, amountMax, search, sort
- [ ] Fetch expenses on component mount
- [ ] Display expenses in table format with columns: description, amount, category, date, status, actions
- [ ] Implement pagination controls (prev/next, page size selector, total count)
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button on API failure
- [ ] Handle empty state gracefully ("No expenses found")
- [ ] Format currency values using locale (PKR by default)
- [ ] Format dates as relative time (e.g., "2 days ago") and fallback to locale date format
- [ ] URL query params sync: ?page=1&status=PENDING&category=travel

**API Contract:**
```typescript
// GET /expenses?page=1&pageSize=10&status=DRAFT&status=SUBMITTED&search=office
interface GetExpensesQuery {
  page?: number; // default 1
  pageSize?: number; // default 10
  status?: ExpenseStatus[]; // multi-select filter
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  categoryId?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string; // search in description, vendor
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'amount:desc' | 'amount:asc';
}

interface GetExpensesResponse {
  data: ExpenseListDto[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ExpenseListDto {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: { id: string; name: string };
  vendor?: { id: string; name: string };
  date: string; // ISO date
  status: ExpenseStatus;
  createdAt: string; // ISO datetime
  createdBy: { id: string; name: string };
  receipts?: Array<{ id: string; url: string; type: string }>;
  approvalTier?: number;
  approvals?: Array<{ status: ApprovalStatus; approvedBy?: string; approvedAt?: string }>;
}
```

**RTK Query Endpoints:**
```typescript
getExpenses: builder.query<
  GetExpensesResponse,
  {
    page?: number;
    pageSize?: number;
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
    categoryId?: string;
    amountMin?: number;
    amountMax?: number;
    search?: string;
    sort?: string;
  }
>({
  query: (params) => ({
    url: '/expenses',
    params: { ...params, status: params.status?.join(',') },
  }),
}),
```

---

#### Task 3.1.2: Implement Expense Filters
**File:** `packages/web/src/components/expenses/ExpenseFilters.tsx`

**Acceptance Criteria:**
- [ ] Status multi-select filter (DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, PAID, CLARIFICATION_REQUESTED, RESUBMITTED)
- [ ] Date range picker (from date, to date) with preset options (Last 7 days, Last 30 days, This month, etc.)
- [ ] Category hierarchical select (loads from API)
- [ ] Amount range slider or min/max input fields
- [ ] Search input for description/vendor text search
- [ ] URL query string sync (URLSearchParams)
- [ ] "Apply Filters" button or auto-apply on change
- [ ] "Clear All" button to reset all filters
- [ ] Preserve filter state on page navigation and return
- [ ] Show active filter count badge
- [ ] Filter form uses React Hook Form with Zod validation

**Interface:**
```typescript
interface ExpenseFiltersProps {
  onFiltersChange: (filters: ExpenseFilters) => void;
  loading?: boolean;
}

interface ExpenseFilters {
  status?: ExpenseStatus[];
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sort?: string;
}

interface FilterPreset {
  label: string;
  value: string;
  getDateRange: () => { from: Date; to: Date };
}
```

---

#### Task 3.1.3: Create ExpenseCard Component
**File:** `packages/web/src/components/expenses/ExpenseCard.tsx`

**Acceptance Criteria:**
- [ ] Display expense amount prominently (formatted with currency symbol)
- [ ] Display date and relative time (e.g., "2 days ago")
- [ ] Display category name with icon
- [ ] Display status badge with color coding (draft=gray, submitted=yellow, pending=orange, approved=green, rejected=red, paid=blue, clarification=amber, resubmitted=cyan)
- [ ] Show receipt thumbnail if available (first receipt image)
- [ ] Display vendor/submitter name
- [ ] Click on card navigates to detail page
- [ ] Hover effect for clickable cards
- [ ] Optional: show approval tier icon/badge
- [ ] Optional: show approval status inline

**Interface:**
```typescript
interface ExpenseCardProps {
  expense: ExpenseListDto;
  onClick?: () => void;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  compact?: boolean;
}
```

**Visual Design (List View):**
```
+------------------------------------------+
| Office Supplies    [Pending] Tier 2      |
| PKR 3,500                   2 days ago   |
| Vendor: Stationary Store                 |
| Category: Office Supplies                |
+------------------------------------------+
```

**Visual Design (Grid View):**
```
+--------------------+
| [Receipt Thumb]    |
|                    |
| PKR 3,500          |
| Office Supplies    |
| [Pending] Tier 2   |
| 2 days ago         |
+--------------------+
```

---

#### Task 3.1.4: List/Grid View Toggle
**Files:**
- `packages/web/src/components/expenses/ViewToggle.tsx` (NEW)
- `packages/web/src/pages/expenses/ExpenseListPage.tsx` (UPDATE)

**Acceptance Criteria:**
- [ ] Toggle button (list icon / grid icon) in page header
- [ ] List view: DataTable format with all columns visible
- [ ] Grid view: Card grid layout (responsive, 1 col mobile, 2 cols tablet, 3 cols desktop)
- [ ] Smooth transition animation between views
- [ ] Persist view preference in localStorage (key: 'expenses_view')
- [ ] ViewToggle component reusable for other list pages
- [ ] Both views support same filtering, sorting, pagination

**Interface:**
```typescript
interface ViewToggleProps {
  value: 'list' | 'grid';
  onChange: (view: 'list' | 'grid') => void;
  listLabel?: string; // default 'List'
  gridLabel?: string; // default 'Grid'
}

type ViewPreference = 'list' | 'grid';
```

---

#### Task 3.1.5: Bulk Selection & Actions
**Files:**
- `packages/web/src/components/expenses/BulkActions.tsx` (NEW)
- `packages/web/src/pages/expenses/ExpenseListPage.tsx` (UPDATE)

**Acceptance Criteria:**
- [ ] Checkbox for each row/card for selection
- [ ] "Select All" checkbox in list view header
- [ ] Shows selected count: "X items selected"
- [ ] Bulk action bar appears when items selected
- [ ] Actions: Submit Selected, Delete Selected (with confirmation)
- [ ] Submit Selected: batch submit multiple draft expenses
- [ ] Delete Selected: only delete DRAFT expenses (disable for submitted)
- [ ] Show confirmation dialog before bulk delete with count
- [ ] Show progress toast during bulk operation
- [ ] Show success toast after bulk operation
- [ ] Clear selection after operation completes
- [ ] Disable bulk actions if no items selected
- [ ] Bulk submit calls `POST /expenses/{id}/submit` for each selected expense

**Interface:**
```typescript
interface BulkActionsProps {
  selectedCount: number;
  selectedItems: ExpenseListDto[];
  onSubmit?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}
```

---

## Story 3.2: Expense Create/Edit Form

Implement a comprehensive expense form with receipt upload, expense splits, and validation.

### Context to Load
```
packages/api/src/modules/expenses/dto/create-expense.dto.ts
packages/api/src/modules/expenses/dto/update-expense.dto.ts
packages/web/src/components/ui/ (Input, Select, DatePicker, FileUpload, etc.)
packages/web/src/features/categories/services/ (categories API)
packages/web/src/features/vendors/services/ (vendors API)
packages/web/src/features/projects/services/ (projects API)
packages/web/src/features/costcenters/services/ (cost centers API)
```

### Tasks

#### Task 3.2.1: Create ExpenseForm Component
**File:** `packages/web/src/components/expenses/ExpenseForm.tsx`

**Acceptance Criteria:**
- [ ] Amount input with currency selector (default PKR)
- [ ] Hierarchical category dropdown (loads from API, searchable)
- [ ] Date picker (defaults to today, past dates allowed)
- [ ] Description textarea (required, max 500 chars)
- [ ] Vendor autocomplete field (loads from API, allow custom entry)
- [ ] Project optional select (hierarchical)
- [ ] Cost center optional select (hierarchical)
- [ ] Reference number optional input
- [ ] Notes optional textarea
- [ ] React Hook Form for form state management
- [ ] Zod schema for validation
- [ ] Show field errors inline below inputs
- [ ] Disable submit while validating or submitting
- [ ] Required field indicators (*)
- [ ] Keyboard navigation (tab, enter)

**Interface:**
```typescript
interface ExpenseFormProps {
  initialValues?: ExpenseFormData;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string; // default 'Save'
  onCancel?: () => void;
}

interface ExpenseFormData {
  amount: number;
  currency: string;
  categoryId: string;
  date: Date;
  description: string;
  vendorId?: string;
  vendorName?: string; // for custom vendor
  projectId?: string;
  costCenterId?: string;
  referenceNumber?: string;
  notes?: string;
}

interface ExpenseFormValidation {
  amount: { required: true; min: 0.01; max: 999999999 };
  currency: { required: true };
  categoryId: { required: true };
  date: { required: true };
  description: { required: true; maxLength: 500 };
}
```

**Zod Schema:**
```typescript
const ExpenseFormSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('PKR'),
  categoryId: z.string().min(1, 'Category is required'),
  date: z.date().max(new Date(), 'Date cannot be in future'),
  description: z.string().min(1, 'Description is required').max(500),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  projectId: z.string().optional(),
  costCenterId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().max(1000).optional(),
});
```

---

#### Task 3.2.2: Receipt Upload Component
**File:** `packages/web/src/components/expenses/ReceiptUpload.tsx`

**Acceptance Criteria:**
- [ ] Drag and drop zone for multiple receipt files
- [ ] Click to browse files
- [ ] Supported formats: images (PNG, JPG, WebP), PDF
- [ ] Max file size: 5MB per file
- [ ] Max files: 10 per expense
- [ ] Shows file preview (thumbnail for images, PDF icon for PDFs)
- [ ] Shows upload progress for each file
- [ ] "Remove" button for each uploaded file
- [ ] Show validation errors (format, size)
- [ ] Disable upload input when loading
- [ ] Support for controlled component (value/onChange)
- [ ] Display receipt count badge

**Interface:**
```typescript
interface ReceiptFile {
  id?: string; // for existing receipts
  file?: File; // for new uploads
  preview?: string; // data URL or existing receipt URL
  name: string;
  size: number;
  type: string;
  progress?: number;
  error?: string;
  isUploading?: boolean;
}

interface ReceiptUploadProps {
  value?: ReceiptFile[];
  onChange?: (files: ReceiptFile[]) => void;
  maxFiles?: number; // default 10
  maxSize?: number; // default 5MB
  accept?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}
```

---

#### Task 3.2.3: Expense Splits Component
**File:** `packages/web/src/components/expenses/ExpenseSplits.tsx`

**Acceptance Criteria:**
- [ ] Add split rows dynamically
- [ ] Each split has: description, amount, category, project (optional), cost center (optional)
- [ ] Display total split amount and compare with expense amount
- [ ] Show warning if split total != expense amount
- [ ] Validation: each split amount > 0, sum matches total
- [ ] "Remove" button for each split row
- [ ] Category dropdown for each split (hierarchical)
- [ ] Project and cost center dropdowns (optional)
- [ ] Supports controlled component pattern
- [ ] Keyboard navigation between fields
- [ ] Copy expense details to first split by default
- [ ] Show running total in table footer

**Interface:**
```typescript
interface ExpenseSplit {
  id?: string;
  description: string;
  amount: number;
  categoryId: string;
  projectId?: string;
  costCenterId?: string;
}

interface ExpenseSplitsProps {
  value?: ExpenseSplit[];
  onChange?: (splits: ExpenseSplit[]) => void;
  totalAmount: number;
  currency?: string;
  disabled?: boolean;
}

interface SplitValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  totalMismatch?: { expected: number; actual: number };
}
```

**Visual Design:**
```
+---------+--------+----------+----------+
| Desc    | Amount | Category | Project  | Remove |
+---------+--------+----------+----------+
| Travel  | 5000   | Travel   | Project1 |   X    |
| Meals   | 3000   | Meals    | Project1 |   X    |
+---------+--------+----------+----------+
| Total:  | 8000   |          |          |
+---------+--------+----------+----------+
| Add Split                    |
```

---

#### Task 3.2.4: ExpenseCreatePage
**File:** `packages/web/src/pages/expenses/ExpenseCreatePage.tsx`

**Acceptance Criteria:**
- [ ] Page layout: breadcrumb (Expenses > Create), title, form
- [ ] ExpenseForm component for main expense details
- [ ] ReceiptUpload component for receipts
- [ ] ExpenseSplits component (optional, collapsible)
- [ ] Two buttons: "Save Draft" (POST draft), "Submit for Approval" (POST submitted)
- [ ] Save Draft: saves with status=DRAFT, doesn't require all fields
- [ ] Submit: validates all fields, saves with status=SUBMITTED, navigates to detail on success
- [ ] Cancel button with confirmation dialog if form has unsaved changes
- [ ] Show loading spinner while submitting
- [ ] Show success toast after save
- [ ] Show error toast with message on failure
- [ ] On success: navigate to ExpenseDetailPage with expense ID
- [ ] Form state saved to session storage on mount/unmount (for recovery if tab closes)
- [ ] URLs: `/expenses/create` for new expense

**API Calls:**
```typescript
// POST /expenses
interface CreateExpenseRequest {
  amount: number;
  currency: string;
  categoryId: string;
  date: string; // ISO date
  description: string;
  status: 'DRAFT' | 'SUBMITTED';
  vendorId?: string;
  projectId?: string;
  costCenterId?: string;
  referenceNumber?: string;
  notes?: string;
}

// POST /receipts/upload (multipart)
// For each receipt file, upload separately
// Then link receipt IDs to expense when creating expense

// POST /expenses/{id}/splits (batch)
interface CreateExpenseSplitsRequest {
  splits: ExpenseSplit[];
}
```

---

#### Task 3.2.5: ExpenseEditPage
**File:** `packages/web/src/pages/expenses/ExpenseEditPage.tsx`

**Acceptance Criteria:**
- [ ] Fetch expense by ID on mount (GET /expenses/{id})
- [ ] Pre-fill form with existing expense data
- [ ] Load existing receipts from expense.receipts
- [ ] Load expense splits from expense.splits
- [ ] Show status badge (read-only, non-editable)
- [ ] Status-based constraints:
  - [ ] DRAFT: allow edit all fields
  - [ ] SUBMITTED/PENDING_APPROVAL: allow edit only description/notes/vendor, disable amount/category
  - [ ] APPROVED/PAID: read-only view, no edits
  - [ ] REJECTED/CLARIFICATION_REQUESTED: allow resubmit flow
  - [ ] RESUBMITTED: allow edit all fields
- [ ] Two buttons: "Save Changes" (PUT), "Resubmit" (if rejected/clarification)
- [ ] Save Changes: updates expense, navigates back to detail
- [ ] Resubmit: updates and sets status to SUBMITTED
- [ ] Show confirmation if user tries to navigate away with unsaved changes
- [ ] URLs: `/expenses/{id}/edit`
- [ ] Loading skeleton while fetching

---

## Story 3.3: Expense Detail Page

Implement a comprehensive detail view with receipt gallery, approval timeline, and contextual actions.

### Context to Load
```
packages/api/src/modules/expenses/dto/expense-detail.dto.ts
packages/api/src/modules/approvals/dto/approval-history.dto.ts
packages/web/src/components/ui/ (Modal, Card, Badge, etc.)
packages/web/src/features/approvals/services/approvals.service.ts
```

### Tasks

#### Task 3.3.1: ExpenseDetailPage
**File:** `packages/web/src/pages/expenses/ExpenseDetailPage.tsx`

**Acceptance Criteria:**
- [ ] Page layout: breadcrumb, title (Expense Detail), sections
- [ ] Fetch expense by ID on mount (GET /expenses/{id})
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button
- [ ] Sections:
  - [ ] Header section: amount, status badge, date, approval tier
  - [ ] Info section: category, vendor, project, cost center, description
  - [ ] Receipt gallery (if receipts exist)
  - [ ] Splits table (if splits exist)
  - [ ] Approval timeline
  - [ ] Action buttons based on status

**Section: Info**
```
Category:    Office Supplies
Vendor:      Stationary Store
Project:     Q1 2024 Initiative
Cost Center: IT Department
Date:        Jan 21, 2024
Reference:   EXP-001234
Notes:       Monthly supplies reorder
```

**Section: Splits Table**
```
| Description    | Amount   | Category | Project | Cost Center |
|----------------|----------|----------|---------|-------------|
| Pens & Pencils | PKR 1500 | Supplies | Q1      | IT          |
| Notebooks      | PKR 2000 | Supplies | Q1      | IT          |
| Total          | PKR 3500 |          |         |             |
```

---

#### Task 3.3.2: ApprovalTimeline Component
**File:** `packages/web/src/components/expenses/ApprovalTimeline.tsx`

**Acceptance Criteria:**
- [ ] Fetch approval history for expense ID (GET /approvals?expenseId={id})
- [ ] Vertical timeline layout (top to bottom)
- [ ] Each approval tier as timeline node:
  - [ ] Tier level (Tier 1, 2, 3, etc.)
  - [ ] Current approver name and email (or "Awaiting approval")
  - [ ] Approval status (PENDING, APPROVED, REJECTED, CLARIFICATION_REQUESTED)
  - [ ] Status icon (clock for pending, checkmark for approved, X for rejected)
  - [ ] Date/time of approval (or empty if pending)
  - [ ] Approver comment/notes (if provided)
  - [ ] Timeline connector line between nodes
- [ ] Color coding:
  - [ ] Pending: gray/blue
  - [ ] Approved: green
  - [ ] Rejected: red
  - [ ] Clarification: amber
- [ ] Expandable comments section
- [ ] Show loading skeleton while fetching
- [ ] Empty state if no approvals yet

**Interface:**
```typescript
interface ApprovalTimelineProps {
  expenseId: string;
  approvals?: ApprovalHistoryDto[];
  loading?: boolean;
  onReload?: () => void;
}

interface ApprovalHistoryDto {
  id: string;
  expenseId: string;
  tier: number;
  status: ApprovalStatus;
  approvedBy?: { id: string; name: string; email: string };
  approvedAt?: string; // ISO datetime
  comment?: string;
  rejectionReason?: string;
  clarificationRequest?: string;
}
```

**Visual Design:**
```
Tier 1
├─ [✓] Manager Approval
│  Approved by: John Doe (john@example.com)
│  Jan 21, 2024 at 10:30 AM
│  Comment: Looks good!
│
Tier 2
├─ [⏱] Finance Review
│  Awaiting approval from: Jane Smith
│
Tier 3
├─ [ ] Director Approval
│  Pending...
```

---

#### Task 3.3.3: Expense Actions Component
**File:** `packages/web/src/components/expenses/ExpenseActions.tsx`

**Acceptance Criteria:**
- [ ] Action buttons rendered based on expense status:
  - [ ] DRAFT: Edit, Submit, Delete
  - [ ] SUBMITTED: Withdraw, Edit (limited)
  - [ ] PENDING_APPROVAL: Withdraw, Edit (limited)
  - [ ] APPROVED: Withdraw, Clone, Edit (read-only), View Only
  - [ ] REJECTED: Edit, Resubmit, Delete
  - [ ] CLARIFICATION_REQUESTED: Edit, Resubmit, View Feedback
  - [ ] RESUBMITTED: Withdraw, Edit (limited)
  - [ ] PAID: View Only
- [ ] Button layout: primary action prominent, secondary actions in dropdown/bar
- [ ] Edit: navigate to edit page
- [ ] Submit: POST /expenses/{id}/submit, show success toast, reload detail
- [ ] Delete: show confirm dialog, DELETE /expenses/{id}, navigate back to list
- [ ] Withdraw: POST /expenses/{id}/withdraw, show success toast, reload detail
- [ ] Clone: navigate to create page with pre-filled data
- [ ] Resubmit: PUT /expenses/{id} with status=SUBMITTED
- [ ] Show loading spinner during action
- [ ] Show error toast on failure
- [ ] Disable actions based on permissions (user must be expense owner for most actions)

**Interface:**
```typescript
interface ExpenseActionsProps {
  expense: ExpenseDetailDto;
  currentUserId: string;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onWithdraw?: () => Promise<void>;
  onClone?: () => void;
  onResubmit?: () => Promise<void>;
  isLoading?: boolean;
  layout?: 'horizontal' | 'dropdown';
}

interface ExpenseDetailDto extends ExpenseListDto {
  notes?: string;
  referenceNumber?: string;
  project?: { id: string; name: string };
  costCenter?: { id: string; name: string };
  splits?: ExpenseSplit[];
  approvals?: ApprovalHistoryDto[];
  attachments?: Array<{ id: string; name: string; url: string }>;
}
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file in `__tests__/` folder:

```
packages/web/src/components/expenses/__tests__/
├── ExpenseCard.test.tsx
├── ExpenseFilters.test.tsx
├── ViewToggle.test.tsx
├── BulkActions.test.tsx
├── ExpenseForm.test.tsx
├── ReceiptUpload.test.tsx
├── ExpenseSplits.test.tsx
├── ApprovalTimeline.test.tsx
└── ExpenseActions.test.tsx

packages/web/src/pages/expenses/__tests__/
├── ExpenseListPage.test.tsx
├── ExpenseCreatePage.test.tsx
├── ExpenseEditPage.test.tsx
└── ExpenseDetailPage.test.tsx
```

### Test Cases per Component

#### ExpenseCard Tests
- [ ] Renders expense data correctly
- [ ] Displays formatted currency
- [ ] Shows correct status badge color
- [ ] Click navigates to detail page
- [ ] Selection checkbox works

#### ExpenseFilters Tests
- [ ] All filter inputs render
- [ ] Filters apply correctly
- [ ] Clear all resets filters
- [ ] URL params sync correctly
- [ ] Date presets work

#### ExpenseListPage Tests
- [ ] Loads and displays expenses
- [ ] Pagination works
- [ ] Filters work
- [ ] View toggle switches between list/grid
- [ ] Bulk selection works
- [ ] Bulk actions execute correctly

#### ExpenseForm Tests
- [ ] Form renders with all fields
- [ ] Validation errors display
- [ ] Form submission works
- [ ] Category dropdown loads and filters
- [ ] Vendor autocomplete works

#### ReceiptUpload Tests
- [ ] Drag and drop works
- [ ] Click to browse works
- [ ] File preview displays
- [ ] File validation (size, type)
- [ ] Remove button works
- [ ] Progress indicator shows

#### ExpenseSplits Tests
- [ ] Add/remove split rows
- [ ] Amount validation
- [ ] Total mismatch warning
- [ ] Category selection works
- [ ] Sum validation

#### ApprovalTimeline Tests
- [ ] Timeline renders correctly
- [ ] Status icons display correctly
- [ ] Approval details show
- [ ] Loads approval history from API
- [ ] Handles loading state

#### ExpenseActions Tests
- [ ] Correct buttons show per status
- [ ] Edit button navigates
- [ ] Submit calls API
- [ ] Delete shows confirmation
- [ ] Withdraw calls API

#### Page Integration Tests (ExpenseListPage, CreatePage, DetailPage)
- [ ] Page renders without errors
- [ ] Data loads from API
- [ ] Form submission works
- [ ] Navigation works
- [ ] Error handling works

### Coverage Target
- Minimum 70% code coverage across components
- All user interactions tested
- All loading/error/empty states tested
- All status-based conditionals tested

---

## Definition of Done

- [ ] All 4 pages implemented (List, Create, Edit, Detail)
- [ ] All 8 components implemented (ExpenseCard, Filters, ViewToggle, BulkActions, Form, ReceiptUpload, Splits, ApprovalTimeline, Actions)
- [ ] expensesApi updated with all required endpoints
- [ ] All components exported from `components/expenses/index.ts`
- [ ] All pages exported from routing configuration
- [ ] TypeScript interfaces for all props and API contracts
- [ ] Tailwind styling (no inline styles)
- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)
- [ ] Loading skeletons for all data-fetching components
- [ ] Error states with retry functionality
- [ ] Empty states with helpful messages
- [ ] Form validation with error messages
- [ ] URL query string sync for filters and pagination
- [ ] Component tests written and passing (70%+ coverage)
- [ ] Integration tests for pages and workflows
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing completed (all workflows)

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-03-expenses
```

### Commits (one per story)
```bash
# Story 3.1
git commit -m "feat(expenses): add expense list page with filters and bulk actions

- Integrate expensesApi with pagination and filtering
- Create ExpenseCard component for list/grid views
- Implement ExpenseFilters with status, date, category, amount filters
- Add ViewToggle for list/grid switching with localStorage persistence
- Implement bulk selection and bulk actions (submit, delete)
- Add URL query param sync for filters and pagination

Task: 3.1.1-3.1.5"

# Story 3.2
git commit -m "feat(expenses): add expense create and edit forms

- Create ExpenseForm with amount, category, date, vendor, project fields
- Implement ReceiptUpload with drag-drop and preview
- Create ExpenseSplits for multi-category expenses
- Build ExpenseCreatePage with save draft and submit buttons
- Build ExpenseEditPage with status-based field constraints
- Add form validation with Zod and React Hook Form

Task: 3.2.1-3.2.5"

# Story 3.3
git commit -m "feat(expenses): add expense detail page with timeline and actions

- Create ExpenseDetailPage with info sections
- Build ApprovalTimeline component with status visualization
- Create ReceiptGallery with zoom functionality
- Implement ExpenseActions with status-based buttons
- Add approval history integration
- Show splits table and expense metadata

Task: 3.3.1-3.3.3"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-03-expenses",
  "feature_name": "Expense Management",
  "module_name": "expenses",

  "context_files": [
    "packages/web/src/features/expenses/services/expenses.service.ts",
    "packages/api/src/modules/expenses/dto/*.ts",
    "packages/api/src/modules/approvals/dto/*.ts",
    "packages/web/src/store/hooks.ts",
    "packages/web/src/components/ui/index.ts"
  ],

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [
      {
        "method": "GET",
        "path": "/expenses",
        "query": {
          "page": "number",
          "pageSize": "number",
          "status": "string[] (comma-separated)",
          "dateFrom": "string (ISO)",
          "dateTo": "string (ISO)",
          "categoryId": "string",
          "amountMin": "number",
          "amountMax": "number",
          "search": "string",
          "sort": "string"
        },
        "response": "GetExpensesResponse"
      },
      {
        "method": "GET",
        "path": "/expenses/{id}",
        "response": "ExpenseDetailDto"
      },
      {
        "method": "POST",
        "path": "/expenses",
        "body": "CreateExpenseRequest",
        "response": "ExpenseDetailDto"
      },
      {
        "method": "PUT",
        "path": "/expenses/{id}",
        "body": "UpdateExpenseRequest",
        "response": "ExpenseDetailDto"
      },
      {
        "method": "DELETE",
        "path": "/expenses/{id}",
        "response": "void"
      },
      {
        "method": "POST",
        "path": "/expenses/{id}/submit",
        "response": "ExpenseDetailDto"
      },
      {
        "method": "POST",
        "path": "/expenses/{id}/withdraw",
        "response": "ExpenseDetailDto"
      },
      {
        "method": "POST",
        "path": "/receipts/upload",
        "body": "FormData (multipart)",
        "response": "ReceiptDto[]"
      },
      {
        "method": "GET",
        "path": "/approvals?expenseId={id}",
        "response": "ApprovalHistoryDto[]"
      }
    ]
  },

  "pages_required": [
    "ExpenseListPage - /expenses",
    "ExpenseCreatePage - /expenses/create",
    "ExpenseEditPage - /expenses/:id/edit",
    "ExpenseDetailPage - /expenses/:id"
  ],

  "components_required": [
    "ExpenseCard (list/grid item)",
    "ExpenseFilters (filter form)",
    "ViewToggle (list/grid switch)",
    "BulkActions (bulk selection bar)",
    "ExpenseForm (main form)",
    "ReceiptUpload (file upload)",
    "ExpenseSplits (split manager)",
    "ApprovalTimeline (approval visualization)",
    "ExpenseActions (status-based actions)"
  ],

  "dependencies_to_use": [
    "@reduxjs/toolkit (RTK Query)",
    "react-hook-form (form state)",
    "zod (validation)",
    "@hookform/resolvers (form validation)",
    "react-router-dom (navigation)",
    "date-fns (date formatting)",
    "clsx (class names)",
    "lucide-react (icons)"
  ],

  "ui_components_available": [
    "Input, Select, DatePicker, Textarea, Checkbox, Radio",
    "FileUpload (from Epic 1)",
    "DataTable, Modal, Badge, Card, EmptyState",
    "Skeleton, Toast (from Epic 1)",
    "ConfirmDialog, Alert, Spinner",
    "Tabs, Breadcrumb, Pagination, Dropdown"
  ],

  "constraints": {
    "must_use": [
      "Tailwind CSS classes exclusively",
      "TypeScript interfaces for all props",
      "RTK Query for all API calls",
      "React Hook Form for form state",
      "Zod for validation schemas",
      "Functional components",
      "URL query params for filter state",
      "localStorage for view preferences"
    ],
    "must_not": [
      "Create custom CSS files",
      "Use any types",
      "Use class components",
      "Hardcode mock data",
      "Inline event handlers (use callbacks)",
      "Create new UI primitives (use existing from Epic 1)"
    ]
  }
}
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Epic 1: UI Components](./epic-01-ui-components.md) | Required UI components |
| [Epic 4: Approvals](./epic-04-approvals.md) | Approval workflow details |
| [Phase 2 WBS](./phase2-frontend-wbs.md) | Overall frontend plan |
| [Expenses API CLAUDE.md](../../packages/api/src/modules/expenses/CLAUDE.md) | Backend API details |
| [Frontend Engineer Agent](../.claude/agents/frontend-engineer.md) | Agent protocol |
