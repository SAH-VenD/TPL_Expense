# Epic 4: Approval Workflow

**Priority:** P1 (Critical)
**Branch:** `feature/epic-04-approvals`
**Estimated Complexity:** Medium-High
**Agent:** frontend-engineer

---

## Overview

Build the complete approval workflow frontend including approval queue, approval actions (approve/reject/clarify), and delegation management. This epic enables approvers, finance staff, and admins to manage expense approvals efficiently.

### Dependencies
- **Depends On:**
  - Epic 1 (UI Component Library) - Uses Modal, DataTable, Badge, Card, EmptyState, Toast, ConfirmDialog, DatePicker, Select, Input, Textarea, Spinner
  - Epic 3 (Expense Management) - Uses Expense interface and expense display components
- **Blocks:** None (standalone workflow)

### Files to Create
```
packages/web/src/
├── pages/approvals/
│   ├── ApprovalQueuePage.tsx
│   └── DelegationsPage.tsx
├── components/approvals/
│   ├── ApprovalCard.tsx
│   ├── ApprovalFilters.tsx
│   ├── BulkApprovalBar.tsx
│   ├── ApproveModal.tsx
│   ├── RejectModal.tsx
│   ├── ClarificationModal.tsx
│   ├── DelegationForm.tsx
│   ├── DelegationCard.tsx
│   └── index.ts (barrel export)
└── types/
    └── approval.types.ts (if needed)
```

### Existing Services (Use These)
```
packages/web/src/features/approvals/services/approvals.service.ts
```

### Backend API Reference
```
packages/api/src/modules/approvals/dto/approval.dto.ts
packages/api/src/modules/approvals/dto/delegation.dto.ts
packages/api/src/modules/approvals/approvals.controller.ts
```

---

## Story 4.1: Approval Queue Page

Build the main approval queue page that displays all pending approvals for the current user.

### Context to Load
```
packages/web/src/features/approvals/services/approvals.service.ts
packages/web/src/features/expenses/services/expenses.service.ts (Expense interface)
packages/web/src/components/ui/ (UI components)
packages/api/src/modules/approvals/dto/approval.dto.ts
```

### Tasks

#### Task 4.1.1: Build ApprovalQueuePage
**File:** `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`

**Acceptance Criteria:**
- [ ] Fetches pending approvals using `useGetPendingApprovalsQuery`
- [ ] Displays approvals in a list/grid layout using ApprovalCard components
- [ ] Supports sorting by:
  - Submission date (newest/oldest)
  - Amount (highest/lowest)
  - Submitter name (A-Z/Z-A)
- [ ] Implements loading state with Skeleton components
- [ ] Implements error state with error message and retry button
- [ ] Shows EmptyState when no pending approvals
- [ ] Integrates with ApprovalFilters component
- [ ] Supports bulk selection mode (checkbox on each card)
- [ ] Shows BulkApprovalBar when items are selected
- [ ] Responsive: cards stack vertically on mobile, grid on desktop
- [ ] Shows total count of pending approvals

**Interface:**
```typescript
interface ApprovalQueuePageProps {
  // No props - uses RTK Query hooks internally
}

interface SortOption {
  field: 'expenseDate' | 'totalAmount' | 'submitterName';
  direction: 'asc' | 'desc';
}
```

---

#### Task 4.1.2: Create ApprovalCard Component
**File:** `packages/web/src/components/approvals/ApprovalCard.tsx`

**Acceptance Criteria:**
- [ ] Displays expense summary:
  - Expense number
  - Category name with icon
  - Total amount with currency
  - Expense date
  - Description (truncated with "Show more" for long text)
- [ ] Shows submitter information:
  - Full name
  - Department (if available)
  - Avatar/initials
- [ ] Quick action buttons:
  - Approve button (green, primary)
  - Reject button (red, outline)
  - Request Clarification button (yellow/amber, outline)
- [ ] "View Details" link navigates to `/expenses/{id}`
- [ ] Selectable checkbox for bulk operations
- [ ] Visual indicator for high-value expenses (above threshold)
- [ ] Shows expense status badge
- [ ] Shows days since submission
- [ ] Hover state with subtle elevation
- [ ] Loading state on action buttons when processing

**Interface:**
```typescript
interface ApprovalCardProps {
  expense: Expense;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onApprove: (expenseId: string) => void;
  onReject: (expenseId: string) => void;
  onRequestClarification: (expenseId: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isClarifying?: boolean;
}
```

---

#### Task 4.1.3: Implement Bulk Approval Actions
**File:** `packages/web/src/components/approvals/BulkApprovalBar.tsx`

**Acceptance Criteria:**
- [ ] Fixed/sticky bar at bottom of screen when items selected
- [ ] Shows count of selected items
- [ ] "Clear Selection" button to deselect all
- [ ] "Select All" button to select all visible items
- [ ] "Bulk Approve" button opens bulk approve modal
- [ ] "Bulk Reject" button opens bulk reject modal
- [ ] Uses `useBulkApproveMutation` for bulk approve
- [ ] Bulk approve modal includes:
  - List of selected expense numbers
  - Optional comment field (shared across all)
  - Total amount being approved
  - Confirm/Cancel buttons
- [ ] Shows toast notification on success/failure
- [ ] Clears selection after successful action
- [ ] Disabled state while processing
- [ ] Smooth slide-up animation on appear

**Interface:**
```typescript
interface BulkApprovalBarProps {
  selectedExpenses: Expense[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  totalExpenses: number;
}

interface BulkApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onConfirm: (comment?: string) => void;
  isLoading?: boolean;
}

interface BulkRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}
```

---

#### Task 4.1.4: Add Approval Filters
**File:** `packages/web/src/components/approvals/ApprovalFilters.tsx`

**Acceptance Criteria:**
- [ ] Filter by submitter (searchable dropdown of users)
- [ ] Filter by amount range:
  - Min amount input
  - Max amount input
  - Predefined quick ranges (< 10K, 10K-50K, 50K-100K, > 100K PKR)
- [ ] Filter by date range:
  - From date picker
  - To date picker
  - Quick presets (Today, This Week, This Month, Last 30 Days)
- [ ] Filter by approval tier (if applicable)
- [ ] "Clear Filters" button resets all filters
- [ ] Active filter count badge
- [ ] Collapsible filter panel on mobile
- [ ] Filters applied immediately (debounced for text inputs)
- [ ] URL sync for shareable filtered views (optional)

**Interface:**
```typescript
interface ApprovalFilters {
  submitterId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  tierId?: string;
}

interface ApprovalFiltersProps {
  filters: ApprovalFilters;
  onFiltersChange: (filters: ApprovalFilters) => void;
  availableSubmitters?: Array<{ id: string; name: string }>;
}
```

---

## Story 4.2: Approval Actions

Build modal components for individual approval actions.

### Context to Load
```
packages/web/src/features/approvals/services/approvals.service.ts
packages/api/src/modules/approvals/dto/approval.dto.ts
packages/web/src/components/ui/Modal.tsx
packages/web/src/components/ui/Textarea.tsx
```

### Tasks

#### Task 4.2.1: Create ApproveModal
**File:** `packages/web/src/components/approvals/ApproveModal.tsx`

**Acceptance Criteria:**
- [ ] Modal title: "Approve Expense"
- [ ] Displays expense summary card:
  - Expense number
  - Submitter name
  - Category
  - Amount and currency
  - Expense date
- [ ] Optional comment field (Textarea):
  - Placeholder: "Add a comment (optional)"
  - Max 1000 characters
  - Character count display
- [ ] Footer buttons:
  - "Cancel" button (secondary)
  - "Approve" button (primary, green)
- [ ] Loading state on Approve button while processing
- [ ] Uses `useApproveExpenseMutation`
- [ ] Shows success toast on approval
- [ ] Closes modal on success
- [ ] Shows error message if approval fails
- [ ] Keyboard: Enter to approve (when not in textarea), Escape to cancel

**Interface:**
```typescript
interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  onSuccess?: () => void;
}
```

---

#### Task 4.2.2: Create RejectModal
**File:** `packages/web/src/components/approvals/RejectModal.tsx`

**Acceptance Criteria:**
- [ ] Modal title: "Reject Expense"
- [ ] Warning styling (red/danger theme in header)
- [ ] Displays expense summary card (same as ApproveModal)
- [ ] Required reason field (Textarea):
  - Label: "Reason for Rejection *"
  - Placeholder: "Please provide a reason for rejecting this expense..."
  - Max 1000 characters
  - Character count display
  - Validation: required, min 10 characters
  - Error message shown if validation fails
- [ ] Footer buttons:
  - "Cancel" button (secondary)
  - "Reject" button (danger/red)
- [ ] Reject button disabled until reason is valid
- [ ] Loading state on Reject button while processing
- [ ] Uses `useRejectExpenseMutation`
- [ ] Shows success toast on rejection
- [ ] Closes modal on success
- [ ] Shows error message if rejection fails

**Interface:**
```typescript
interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  onSuccess?: () => void;
}
```

---

#### Task 4.2.3: Create ClarificationModal
**File:** `packages/web/src/components/approvals/ClarificationModal.tsx`

**Acceptance Criteria:**
- [ ] Modal title: "Request Clarification"
- [ ] Displays expense summary card (same as other modals)
- [ ] Shows history of previous clarifications (if any):
  - List of previous questions with timestamps
  - Submitter's responses (if any)
  - Visual timeline format
  - Scrollable if many entries
- [ ] Required question field (Textarea):
  - Label: "Your Question *"
  - Placeholder: "What clarification do you need from the submitter?"
  - Max 1000 characters
  - Character count display
  - Validation: required, min 10 characters
- [ ] Footer buttons:
  - "Cancel" button (secondary)
  - "Send" button (primary, amber/yellow)
- [ ] Send button disabled until question is valid
- [ ] Loading state on Send button while processing
- [ ] Uses `useRequestClarificationMutation`
- [ ] Shows success toast on send
- [ ] Closes modal on success
- [ ] Shows info message: "The submitter will be notified and can respond"

**Interface:**
```typescript
interface ClarificationHistory {
  id: string;
  question: string;
  response?: string;
  askedBy: { id: string; firstName: string; lastName: string };
  askedAt: string;
  respondedAt?: string;
}

interface ClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  clarificationHistory?: ClarificationHistory[];
  onSuccess?: () => void;
}
```

---

## Story 4.3: Delegation Management

Build the delegation management page and forms.

### Context to Load
```
packages/web/src/features/approvals/services/approvals.service.ts
packages/api/src/modules/approvals/dto/delegation.dto.ts
packages/web/src/components/ui/DatePicker.tsx
packages/web/src/components/ui/Select.tsx
```

### Tasks

#### Task 4.3.1: Build DelegationsPage
**File:** `packages/web/src/pages/approvals/DelegationsPage.tsx`

**Acceptance Criteria:**
- [ ] Page title: "Approval Delegations"
- [ ] Breadcrumb: Home > Approvals > Delegations
- [ ] Lists active delegations using `useGetDelegationsQuery`
- [ ] Shows delegations in card format (DelegationCard)
- [ ] "Create Delegation" button opens DelegationForm modal
- [ ] Loading state with Skeleton
- [ ] Error state with retry
- [ ] EmptyState when no delegations:
  - Icon: user-switch or similar
  - Title: "No Active Delegations"
  - Description: "Create a delegation to have someone else approve expenses on your behalf"
  - Action: "Create Delegation" button
- [ ] Sections:
  - "Delegations I Created" (where user is fromUser)
  - "Delegations Assigned to Me" (where user is toUser)
- [ ] Only "Delegations I Created" can be revoked

**Interface:**
```typescript
interface DelegationsPageProps {
  // No props - uses RTK Query hooks internally
}
```

---

#### Task 4.3.2: Create DelegationForm
**File:** `packages/web/src/components/approvals/DelegationForm.tsx`

**Acceptance Criteria:**
- [ ] Can be used as modal content or standalone form
- [ ] Form fields:
  - Delegate To (searchable user selector):
    - Label: "Delegate approvals to *"
    - Only shows users with approval roles (APPROVER, FINANCE, ADMIN)
    - Shows user name and role
    - Required validation
  - Start Date (DatePicker):
    - Label: "Start Date *"
    - Min date: today
    - Required validation
  - End Date (DatePicker):
    - Label: "End Date *"
    - Min date: start date
    - Required validation
    - Must be after start date
  - Reason (Textarea):
    - Label: "Reason (optional)"
    - Placeholder: "e.g., Out of office, vacation, etc."
    - Max 500 characters
- [ ] Uses React Hook Form with Zod validation
- [ ] Uses `useCreateDelegationMutation`
- [ ] Shows success toast on create
- [ ] Closes modal/resets form on success
- [ ] Shows error if date range overlaps with existing delegation
- [ ] Loading state on submit button
- [ ] Cancel button to close without saving

**Interface:**
```typescript
interface DelegationFormData {
  delegateId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

interface DelegationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}
```

---

#### Task 4.3.3: Create DelegationCard Component
**File:** `packages/web/src/components/approvals/DelegationCard.tsx`

**Acceptance Criteria:**
- [ ] Displays delegation information:
  - From user name and avatar
  - To user name and avatar
  - Arrow icon between users
  - Date range (formatted nicely)
  - Reason (if provided)
  - Days remaining badge
- [ ] Status indicator:
  - "Active" (green) if current date is within range
  - "Upcoming" (blue) if start date is in future
  - "Expired" (gray) if end date has passed (shouldn't show, but handle)
- [ ] "Revoke" button (only shown if user created the delegation)
- [ ] Revoke opens ConfirmDialog:
  - Title: "Revoke Delegation?"
  - Message: "This will immediately stop [delegate name] from approving on your behalf."
  - Confirm: "Revoke" (danger)
  - Cancel: "Keep Active"
- [ ] Uses `useRevokeDelegationMutation`
- [ ] Shows toast on successful revocation
- [ ] Loading state while revoking

**Interface:**
```typescript
interface DelegationCardProps {
  delegation: Delegation;
  canRevoke?: boolean;
  onRevoke?: (delegationId: string) => void;
  isRevoking?: boolean;
}
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file with:
- [ ] Renders without crashing
- [ ] All props work correctly
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] User interactions trigger correct callbacks
- [ ] Form validation works (for form components)
- [ ] Keyboard navigation works

### Test File Locations
```
packages/web/src/pages/approvals/__tests__/
├── ApprovalQueuePage.test.tsx
└── DelegationsPage.test.tsx

packages/web/src/components/approvals/__tests__/
├── ApprovalCard.test.tsx
├── ApprovalFilters.test.tsx
├── BulkApprovalBar.test.tsx
├── ApproveModal.test.tsx
├── RejectModal.test.tsx
├── ClarificationModal.test.tsx
├── DelegationForm.test.tsx
└── DelegationCard.test.tsx
```

### Coverage Target
- Minimum 70% code coverage
- All user interactions tested
- All API mutations tested with MSW mocks

---

## Definition of Done

- [ ] All 9 components/pages implemented
- [ ] All components exported from `index.ts`
- [ ] TypeScript interfaces for all props
- [ ] Tailwind styling (no inline styles)
- [ ] Responsive at all breakpoints (mobile, tablet, desktop)
- [ ] Keyboard accessible
- [ ] Component tests written and passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Integration with approvalsApi verified
- [ ] Toast notifications for all actions
- [ ] Loading/error states implemented

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-04-approvals
```

### Commits (one per story)
```bash
# Story 4.1
git commit -m "feat(approvals): add approval queue page and components

- Add ApprovalQueuePage with sorting and pagination
- Create ApprovalCard with quick actions
- Implement bulk approval functionality
- Add approval filters (submitter, amount, date)

Task: 4.1.1-4.1.4"

# Story 4.2
git commit -m "feat(approvals): add approval action modals

- Create ApproveModal with optional comment
- Create RejectModal with required reason
- Create ClarificationModal with history display

Task: 4.2.1-4.2.3"

# Story 4.3
git commit -m "feat(approvals): add delegation management

- Build DelegationsPage with active delegations list
- Create DelegationForm with date validation
- Add DelegationCard with revoke functionality

Task: 4.3.1-4.3.3"
```

---

## TypeScript Interfaces Reference

### From Backend DTOs

```typescript
// From packages/api/src/modules/approvals/dto/approval.dto.ts
interface ApproveDto {
  expenseId: string;
  comments?: string; // max 1000 chars
}

interface BulkApproveDto {
  expenseIds: string[];
  comments?: string; // max 1000 chars
}

interface RejectDto {
  expenseId: string;
  reason: string; // required, max 1000 chars
}

interface ClarifyDto {
  expenseId: string;
  question: string; // required, max 1000 chars
}

// From packages/api/src/modules/approvals/dto/delegation.dto.ts
interface CreateDelegationDto {
  delegateId: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  reason?: string;   // max 500 chars
}

interface RevokeDelegationDto {
  delegationId: string;
}
```

### Frontend Service Interfaces
```typescript
// From packages/web/src/features/approvals/services/approvals.service.ts
interface ApprovalFilters {
  page?: number;
  pageSize?: number;
  status?: string;
}

interface Delegation {
  id: string;
  fromUserId: string;
  fromUser: { id: string; firstName: string; lastName: string };
  toUserId: string;
  toUser: { id: string; firstName: string; lastName: string };
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
}
```

### Expense Interface (from Epic 3)
```typescript
// From packages/web/src/features/expenses/services/expenses.service.ts
interface Expense {
  id: string;
  expenseNumber: string;
  type: 'OUT_OF_POCKET' | 'PETTY_CASH';
  status: string;
  submitterId: string;
  submitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  vendorName?: string;
  expenseDate: string;
  currency: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  amountInPKR?: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  description?: string;
  receipts?: Array<{
    id: string;
    fileName: string;
    s3Key: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

---

## API Endpoints Reference

| Method | Endpoint | Description | RTK Query Hook |
|--------|----------|-------------|----------------|
| GET | /approvals/pending | Pending approvals | `useGetPendingApprovalsQuery` |
| POST | /approvals/approve | Approve expense | `useApproveExpenseMutation` |
| POST | /approvals/bulk-approve | Bulk approve | `useBulkApproveMutation` |
| POST | /approvals/reject | Reject expense | `useRejectExpenseMutation` |
| POST | /approvals/clarify | Request clarification | `useRequestClarificationMutation` |
| GET | /approvals/delegations | Get delegations | `useGetDelegationsQuery` |
| POST | /approvals/delegations | Create delegation | `useCreateDelegationMutation` |
| DELETE | /approvals/delegations/:id | Revoke delegation | `useRevokeDelegationMutation` |

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-04-approvals",
  "feature_name": "Approval Workflow",
  "module_name": "approvals",

  "context_files": [
    "packages/web/src/features/approvals/services/approvals.service.ts",
    "packages/web/src/features/expenses/services/expenses.service.ts",
    "packages/api/src/modules/approvals/dto/approval.dto.ts",
    "packages/api/src/modules/approvals/dto/delegation.dto.ts",
    "packages/web/src/components/ui/",
    "packages/web/src/styles/globals.css"
  ],

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [
      "GET /approvals/pending",
      "POST /approvals/approve",
      "POST /approvals/bulk-approve",
      "POST /approvals/reject",
      "POST /approvals/clarify",
      "GET /approvals/delegations",
      "POST /approvals/delegations",
      "DELETE /approvals/delegations/:id"
    ],
    "service_file": "packages/web/src/features/approvals/services/approvals.service.ts"
  },

  "pages_required": [
    "ApprovalQueuePage",
    "DelegationsPage"
  ],

  "components_required": [
    "ApprovalCard",
    "ApprovalFilters",
    "BulkApprovalBar",
    "ApproveModal",
    "RejectModal",
    "ClarificationModal",
    "DelegationForm",
    "DelegationCard"
  ],

  "dependencies_to_use": [
    "@headlessui/react (for accessible modals)",
    "react-hook-form (form handling)",
    "zod (validation)",
    "@hookform/resolvers (zod integration)",
    "date-fns (date formatting)",
    "clsx (class name utility)",
    "lucide-react (icons)"
  ],

  "ui_components_from_epic_1": [
    "Modal",
    "DataTable",
    "Badge",
    "Card",
    "EmptyState",
    "Toast/useToast",
    "ConfirmDialog",
    "DatePicker",
    "Select",
    "Input",
    "Textarea",
    "Spinner",
    "Skeleton",
    "Checkbox"
  ],

  "constraints": {
    "must_use": [
      "RTK Query hooks from approvals.service.ts",
      "Tailwind CSS classes",
      "TypeScript interfaces",
      "Functional components",
      "React Hook Form for forms"
    ],
    "must_not": [
      "Create custom CSS files",
      "Use any types",
      "Use class components",
      "Create duplicate UI primitives (use from Epic 1)"
    ]
  },

  "roles_allowed": ["APPROVER", "FINANCE", "ADMIN"]
}
```
