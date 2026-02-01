# Epics 9-11: Advanced Features (P3 - Nice-to-Have)

This document provides a combined work breakdown structure for the three advanced features epics: OCR Integration, Pre-Approval Workflow, and Notifications. These are lower-priority features that enhance the core expense management system.

---

# Epic 9: OCR Integration

**Priority:** P3 (Nice-to-have)
**Branch:** `feature/epic-09-ocr`
**Estimated Complexity:** High
**Agent:** frontend-engineer

---

## Overview

Implement receipt scanning and OCR functionality to automatically extract expense data from receipt images. Users can scan receipts with their camera or upload images, and the system will extract key information (vendor, amount, date, items) and auto-populate the expense form. This reduces manual data entry and improves accuracy.

### Dependencies
- **Depends On:** Epic 1 (UI Components), Epic 3 (Expense Management)
- **Blocks:** None
- **Backend Services Required:**
  - Receipt upload API (`POST /receipts/upload`)
  - OCR processing endpoint (`POST /receipts/{id}/extract`)
  - Receipt retrieval API (`GET /receipts/{id}`)

### Files to Create/Update
```
packages/web/src/
├── components/ocr/
│   ├── ScanReceiptButton.tsx (NEW)
│   ├── OCRStatusDisplay.tsx (NEW)
│   ├── ReceiptPreviewCard.tsx (NEW)
│   ├── ConfidenceIndicator.tsx (NEW)
│   ├── AutoPopulateConfirm.tsx (NEW)
│   ├── ReceiptGallery.tsx (NEW)
│   ├── ReceiptLightbox.tsx (NEW)
│   ├── ReceiptAnnotations.tsx (NEW)
│   └── index.ts (barrel export)
├── features/ocr/services/
│   └── receipts.service.ts (NEW - RTK Query service)
├── hooks/
│   ├── useReceiptCamera.ts (NEW)
│   └── useOCRExtraction.ts (NEW)
└── types/
    └── ocr.types.ts (NEW)
```

---

## Story 9.1: Receipt Scanning UI

Implement the receipt scanning interface with camera access, file upload, and OCR processing visualization.

### Context to Load
```
packages/web/src/components/ui/ (FileUpload, Spinner, Card, Badge, Modal, Alert)
packages/web/src/features/expenses/services/expenses.service.ts (expense DTOs)
packages/api/src/modules/receipts/dto/*.ts (Receipt DTOs)
navigator.mediaDevices API (browser Camera API)
```

### Tasks

#### Task 9.1.1: ScanReceiptButton Component
**File:** `packages/web/src/components/ocr/ScanReceiptButton.tsx`

**Acceptance Criteria:**
- [ ] Render camera icon button with label "Scan Receipt"
- [ ] On desktop: open file picker dialog (accept image/* formats)
- [ ] On mobile: detect device capability and open camera app if available
- [ ] Display file format validation (JPEG, PNG, WEBP, TIFF supported)
- [ ] Show max file size warning (10MB limit)
- [ ] Handle file selection and trigger parent callback
- [ ] Show loading state during file processing
- [ ] Display error message if camera permission denied
- [ ] Accessibility: proper aria-labels, keyboard support
- [ ] Responsive button sizing for mobile/tablet/desktop

**Interface:**
```typescript
interface ScanReceiptButtonProps {
  onFileSelected: (file: File) => Promise<void>;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

interface ReceiptFile {
  file: File;
  preview: string;
  dimensions?: { width: number; height: number };
  size: number;
  format: string;
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Button renders with camera icon
- [ ] Clicking button opens file picker on desktop
- [ ] Selected file triggers onFileSelected callback
- [ ] File validation errors displayed
- [ ] Loading state shows spinner
- [ ] Mobile detection works correctly
- [ ] Keyboard support (Enter, Space to activate)
- [ ] ARIA labels present and descriptive
```

---

#### Task 9.1.2: OCRStatusDisplay Component
**File:** `packages/web/src/components/ocr/OCRStatusDisplay.tsx`

**Acceptance Criteria:**
- [ ] Display processing spinner with "Extracting receipt data..." text
- [ ] Show extraction progress (0-100%) with progress bar
- [ ] Render extracted data preview card once complete
- [ ] Display detected fields: vendor name, amount, date, items, tax
- [ ] Show confidence level for each field (high: green, medium: yellow, low: red)
- [ ] Highlight fields with low confidence with warning icon
- [ ] Render "Edit before confirming" hint
- [ ] Show error message with retry option on OCR failure
- [ ] Display success state with checkmark animation
- [ ] Handle timeout scenario (show retry button after 30s)
- [ ] Responsive card layout for mobile/desktop

**Interface:**
```typescript
interface OCRStatusDisplayProps {
  status: 'idle' | 'processing' | 'success' | 'error';
  progress?: number;
  extractedData?: ExtractedReceiptData;
  error?: string;
  onRetry?: () => Promise<void>;
  onConfirm?: (data: ExtractedReceiptData) => void;
  isLoading?: boolean;
}

interface ExtractedReceiptData {
  vendor: FieldData<string>;
  amount: FieldData<number>;
  date: FieldData<string>;
  currency?: FieldData<string>;
  items?: FieldData<ReceiptLineItem[]>;
  tax?: FieldData<number>;
  total?: FieldData<number>;
  extractedAt: string;
  processingTime: number; // milliseconds
}

interface FieldData<T> {
  value: T;
  confidence: 'high' | 'medium' | 'low';
  confidence_score?: number; // 0-1
  raw_text?: string; // Original extracted text
  bounding_box?: BoundingBox;
}

interface ReceiptLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Shows spinner in processing state
- [ ] Displays extracted data once available
- [ ] Renders confidence indicators with correct colors
- [ ] Low confidence fields highlighted with warning
- [ ] Progress bar updates correctly
- [ ] Error state shows message and retry button
- [ ] Retry callback fires on button click
- [ ] Success animation plays
- [ ] Timeout handled after 30s
- [ ] Responsive layout adapts to screen size
```

---

#### Task 9.1.3: Auto-Populate Form from OCR
**File:** `packages/web/src/hooks/useOCRExtraction.ts`

**Acceptance Criteria:**
- [ ] Create hook that accepts extracted receipt data and expense form methods
- [ ] Map OCR fields to expense form fields (vendor → vendor, amount → amount, date → date)
- [ ] Query vendor API to find matching vendors from extracted vendor name
- [ ] Find matching category from expense categories based on OCR context
- [ ] Auto-fill form fields with high/medium confidence values
- [ ] Allow user to edit/override any auto-filled value before confirming
- [ ] Mark auto-filled fields with visual indicator (light blue background)
- [ ] Provide "Use original values" button to revert auto-filled fields
- [ ] Validate all populated data before passing to form
- [ ] Generate audit trail of OCR auto-population
- [ ] Handle currency conversion if receipt currency differs from user's default

**Interface:**
```typescript
interface UseOCRExtractionOptions {
  formMethods: UseFormReturn<ExpenseFormData>;
  onAutoPopulate?: (fields: string[]) => void;
  vendorMatchThreshold?: number; // 0-1, default 0.8
  categoryMatchThreshold?: number; // 0-1, default 0.7
}

interface OCRAutoPopulateResult {
  populatedFields: string[];
  originalValues: Record<string, any>;
  matchedVendor?: VendorDto;
  matchedCategory?: CategoryDto;
  confidence: {
    [field: string]: number;
  };
}

interface OCRAutoPopulateAuditLog {
  timestamp: string;
  sourceReceiptId: string;
  autoPopulatedFields: string[];
  userOverrides: Record<string, any>;
}

// Hook return type
interface UseOCRExtractionReturn {
  autoPopulateForm: (extractedData: ExtractedReceiptData) => Promise<OCRAutoPopulateResult>;
  revertAutoFill: (fields?: string[]) => void;
  getConfidenceScore: (field: string) => number;
  isAutoFilled: (field: string) => boolean;
  auditLog: OCRAutoPopulateAuditLog[];
}
```

**Hook Tests:**
```typescript
// Test cases:
- [ ] Hook initializes correctly with form methods
- [ ] Auto-populates matching vendor from extracted name
- [ ] Auto-populates category based on OCR context
- [ ] Maps OCR fields to expense form fields correctly
- [ ] Marks fields as auto-filled with visual indicator
- [ ] Allows user to edit auto-filled values
- [ ] Revert button restores original values
- [ ] Validates populated data
- [ ] Handles currency conversion
- [ ] Maintains audit log of auto-population
- [ ] Respects confidence thresholds
```

---

## Story 9.2: Receipt Gallery

Implement a gallery view for uploaded receipts with lightbox modal, annotations, and side-by-side comparison.

### Tasks

#### Task 9.2.1: ReceiptGallery Component
**File:** `packages/web/src/components/ocr/ReceiptGallery.tsx`

**Acceptance Criteria:**
- [ ] Render thumbnail grid of receipts (responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop)
- [ ] Thumbnail shows receipt preview image with loading skeleton
- [ ] Hover effect shows receipt date, amount, and quick actions overlay
- [ ] Click thumbnail opens lightbox modal with full-size receipt
- [ ] Show receipt upload date and file size on thumbnail
- [ ] Support drag-and-drop to upload new receipts
- [ ] Implement infinite scroll or "Load more" button for large galleries
- [ ] Show empty state when no receipts
- [ ] Implement search/filter by date or amount
- [ ] Support delete receipt action with confirmation
- [ ] Responsive grid layout for all screen sizes

**Interface:**
```typescript
interface ReceiptGalleryProps {
  receipts: ReceiptThumbnailDto[];
  onReceiptClick?: (receipt: ReceiptDto) => void;
  onReceiptDelete?: (receiptId: string) => Promise<void>;
  onReceiptUpload?: (files: File[]) => Promise<void>;
  isLoading?: boolean;
  allowDelete?: boolean;
  allowUpload?: boolean;
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

interface ReceiptThumbnailDto {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  mimeType: string;
  thumbnailUrl: string;
  previewUrl: string;
}

interface ReceiptDto {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl: string;
  uploadedAt: string;
  size: number;
  mimeType: string;
  extractedData?: ExtractedReceiptData;
  expenseId?: string;
  createdBy: UserDto;
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Grid renders with correct number of columns per breakpoint
- [ ] Thumbnails display loading skeleton
- [ ] Click thumbnail opens lightbox
- [ ] Hover shows receipt info and actions
- [ ] Delete action triggers confirmation
- [ ] Drag-and-drop accepts image files
- [ ] Infinite scroll loads more receipts
- [ ] Empty state displays when no receipts
- [ ] Search filters receipts by date/amount
- [ ] Responsive layout adapts to screen size
```

---

#### Task 9.2.2: ReceiptLightbox and Annotations Component
**File:** `packages/web/src/components/ocr/ReceiptLightbox.tsx` and `packages/web/src/components/ocr/ReceiptAnnotations.tsx`

**Acceptance Criteria (Lightbox):**
- [ ] Display full-size receipt image in modal
- [ ] Implement pan (click-drag) functionality to move around large images
- [ ] Implement pinch-to-zoom on mobile devices
- [ ] Zoom controls: +/- buttons and zoom percentage display
- [ ] Fit to screen button to reset view
- [ ] Download original receipt file button
- [ ] Rotate image 90° button for mobile-taken photos
- [ ] Share receipt functionality (copy link)
- [ ] Previous/next buttons to browse receipt gallery
- [ ] Keyboard shortcuts: arrow keys for navigate, +/- for zoom, ESC to close
- [ ] Show receipt metadata: file name, size, uploaded date, extracted data status
- [ ] Responsive layout for mobile/tablet/desktop

**Acceptance Criteria (Annotations):**
- [ ] Overlay extracted field regions as highlighted boxes on receipt image
- [ ] Show field labels above/below highlighted regions
- [ ] Color-code regions by confidence level (green: high, yellow: medium, red: low)
- [ ] Hover field label to highlight corresponding region
- [ ] Click annotation to show full extracted value in tooltip
- [ ] Side-by-side view: original image vs extracted data list
- [ ] "Show annotations" toggle to hide/show field regions
- [ ] Export annotated image as PNG

**Interface:**
```typescript
interface ReceiptLightboxProps {
  receipt: ReceiptDto;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  showAnnotations?: boolean;
  onAnnotationsToggle?: (show: boolean) => void;
}

interface ReceiptAnnotationsProps {
  receipt: ReceiptDto;
  extractedData: ExtractedReceiptData;
  highlightField?: string;
  confidenceThreshold?: 'all' | 'medium' | 'high';
  onFieldClick?: (field: string) => void;
}

interface ReceiptLightboxControls {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  showAnnotations: boolean;
}

interface AnnotatedRegion {
  field: string;
  boundingBox: BoundingBox;
  value: string;
  confidence: 'high' | 'medium' | 'low';
}
```

**Component Tests:**
```typescript
// Lightbox Tests:
- [ ] Image displays in modal
- [ ] Pan functionality moves image
- [ ] Zoom controls increase/decrease zoom
- [ ] Fit to screen resets zoom/pan
- [ ] Download button triggers file download
- [ ] Rotate button rotates image 90°
- [ ] Keyboard shortcuts work (arrows, +/-, ESC)
- [ ] Previous/next buttons navigate receipts
- [ ] Metadata displays correctly
- [ ] Responsive layout adapts to screen

// Annotations Tests:
- [ ] Field regions highlighted with boxes
- [ ] Confidence color-coding correct
- [ ] Hover shows field labels
- [ ] Click annotation shows tooltip
- [ ] Side-by-side view displays correctly
- [ ] Annotations toggle show/hide
- [ ] Export annotated image works
```

---

# Epic 10: Pre-Approval Workflow

**Priority:** P3 (Nice-to-have)
**Branch:** `feature/epic-10-preapproval`
**Estimated Complexity:** Medium
**Agent:** frontend-engineer

---

## Overview

Implement a pre-approval workflow that allows users to request approval for an estimated expense before actually submitting a detailed expense report. Users can request pre-approval with basic information (amount, category, purpose), and once approved, they can create actual expense reports linked to that pre-approval. This is useful for business trips or large planned expenses.

### Dependencies
- **Depends On:** Epic 1 (UI Components), Epic 3 (Expense Management), Epic 4 (Approval Workflow)
- **Blocks:** None
- **Backend Services Required:**
  - Pre-approval request API (`POST /pre-approvals`)
  - Get pre-approvals list (`GET /pre-approvals`)
  - Get pre-approval detail (`GET /pre-approvals/{id}`)
  - Approve/reject pre-approval (`POST /pre-approvals/{id}/approve`, `POST /pre-approvals/{id}/reject`)

### Files to Create/Update
```
packages/web/src/
├── pages/preapproval/
│   ├── PreApprovalListPage.tsx (NEW)
│   ├── PreApprovalDetailPage.tsx (NEW)
│   └── PreApprovalCreatePage.tsx (NEW)
├── components/preapproval/
│   ├── PreApprovalForm.tsx (NEW)
│   ├── PreApprovalCard.tsx (NEW)
│   ├── PreApprovalListView.tsx (NEW)
│   ├── PreApprovalDetail.tsx (NEW)
│   ├── PreApprovalTimeline.tsx (NEW)
│   ├── PreApprovalStatusBadge.tsx (NEW)
│   ├── ExpenseFromPreApprovalModal.tsx (NEW)
│   ├── PreApprovalValidationAlert.tsx (NEW)
│   └── index.ts (barrel export)
├── features/preapproval/services/
│   └── preapproval.service.ts (NEW - RTK Query service)
└── hooks/
    └── usePreApprovalValidation.ts (NEW)
```

---

## Story 10.1: Pre-Approval Request

Implement the interface for creating and submitting pre-approval requests.

### Context to Load
```
packages/web/src/components/ui/ (Input, Select, DatePicker, Textarea, Card, Modal, Alert)
packages/web/src/features/expenses/services/expenses.service.ts (category, vendor APIs)
packages/api/src/modules/preapprovals/dto/*.ts (Pre-approval DTOs)
```

### Tasks

#### Task 10.1.1: PreApprovalRequestPage
**File:** `packages/web/src/pages/preapproval/PreApprovalCreatePage.tsx`

**Acceptance Criteria:**
- [ ] Render page title "Request Pre-Approval"
- [ ] Show breadcrumb navigation (Dashboard > Pre-Approvals > New Request)
- [ ] Display form to enter pre-approval details
- [ ] Render estimated amount input field (required, decimal, currency selector)
- [ ] Show purpose/justification textarea (required, min 20 chars, max 1000 chars)
- [ ] Include expense category selector (required, hierarchical)
- [ ] Add optional vendor name input or selector
- [ ] Include expected expense date picker (required, must be future date)
- [ ] Show validity period selector (30, 60, 90 days from approval)
- [ ] Display estimation vs. actual warning message
- [ ] Render form validation errors inline
- [ ] Show character count for textarea
- [ ] Implement submit button that disables on submission
- [ ] Show loading spinner during submission
- [ ] Display success message and redirect to pre-approvals list on success
- [ ] Show error message with retry option on failure

**Interface:**
```typescript
interface PreApprovalCreatePageProps {
  // Page component, no props needed
}

interface PreApprovalFormData {
  estimatedAmount: number;
  currency: string;
  purpose: string;
  categoryId: string;
  vendorId?: string;
  vendorName?: string;
  expectedExpenseDate: string; // ISO date
  validityPeriod: 30 | 60 | 90; // days
  attachments?: File[];
  notes?: string;
}

interface CreatePreApprovalRequest {
  estimatedAmount: number;
  currency: string;
  purpose: string;
  categoryId: string;
  vendorId?: string;
  expectedExpenseDate: string;
  validityPeriodDays: number;
  additionalNotes?: string;
}

interface PreApprovalResponse {
  id: string;
  referenceNumber: string;
  estimatedAmount: number;
  currency: string;
  status: PreApprovalStatus;
  category: CategoryDto;
  purpose: string;
  expectedExpenseDate: string;
  validFrom: string;
  validUntil: string;
  requestedBy: UserDto;
  requestedAt: string;
  approvers: ApproverInfo[];
  currentApprovalTier: number;
}

type PreApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'USED';

interface ApproverInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
```

**Page Tests:**
```typescript
// Test cases:
- [ ] Page renders with form
- [ ] Form validation shows errors for empty fields
- [ ] Amount input accepts decimal values
- [ ] Category dropdown loads and selects options
- [ ] Date picker restricts to future dates
- [ ] Textarea character count displays
- [ ] Estimated vs actual warning shows
- [ ] Submit button disables during submission
- [ ] Success message displays after submission
- [ ] Redirects to list page after success
- [ ] Error message shows with retry
```

---

#### Task 10.1.2: PreApprovalForm Component
**File:** `packages/web/src/components/preapproval/PreApprovalForm.tsx`

**Acceptance Criteria:**
- [ ] Accept form methods from parent (React Hook Form)
- [ ] Render input field for estimated amount with currency selector
- [ ] Show purpose textarea with char count and help text
- [ ] Implement category hierarchical select (loads from API)
- [ ] Include vendor selector with autocomplete (optional)
- [ ] Render expected expense date picker
- [ ] Show validity period selector as radio buttons or dropdown
- [ ] Display form validation errors inline
- [ ] Implement conditional rendering: show vendor field only if user selects certain categories
- [ ] Show helper text: "Pre-approval is valid for selected period from approval date"
- [ ] Implement reset form button
- [ ] Show currency conversion info if needed
- [ ] Disable form fields while submitting
- [ ] Accessible form with proper labels and ARIA attributes
- [ ] Responsive layout for mobile/tablet/desktop

**Interface:**
```typescript
interface PreApprovalFormProps {
  onSubmit: (data: PreApprovalFormData) => Promise<void>;
  initialData?: Partial<PreApprovalFormData>;
  isLoading?: boolean;
  defaultCurrency?: string;
  hideSubmitButton?: boolean;
  submitButtonLabel?: string;
  formMethods?: UseFormReturn<PreApprovalFormData>;
}

interface ValidityPeriodOption {
  value: 30 | 60 | 90;
  label: string;
  description: string;
}

interface PreApprovalFormState {
  isValid: boolean;
  isDirty: boolean;
  errors: FieldErrors<PreApprovalFormData>;
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Form renders all fields
- [ ] Amount input validation works
- [ ] Category selector loads options
- [ ] Vendor field shows/hides conditionally
- [ ] Date picker restricts to future dates
- [ ] Validity period options display
- [ ] Form validation errors show inline
- [ ] Submit button triggers onSubmit callback
- [ ] Form resets on reset button click
- [ ] Disabled state during submission
- [ ] Currency selector works
- [ ] Accessible labels and ARIA attributes present
- [ ] Responsive layout works
```

---

## Story 10.2: Pre-Approval Management

Implement list view, status tracking, and linking expenses to pre-approvals.

### Tasks

#### Task 10.2.1: PreApprovalListPage
**File:** `packages/web/src/pages/preapproval/PreApprovalListPage.tsx`

**Acceptance Criteria:**
- [ ] Display list of user's pre-approval requests
- [ ] Render pre-approvals in table format: reference number, amount, category, purpose, status, expiry date, actions
- [ ] Implement status filter (pending/approved/rejected/used/expired)
- [ ] Add date range filter (from/to dates)
- [ ] Implement category filter
- [ ] Show total count of pre-approvals and filtered results
- [ ] Implement sorting by date, amount, status
- [ ] Display "Used" indicator next to approved pre-approvals that have linked expenses
- [ ] Show expiry countdown for approved pre-approvals (e.g., "Expires in 15 days")
- [ ] Quick action button to create expense from approved pre-approval
- [ ] Link to view pre-approval detail page
- [ ] Show loading skeleton while fetching
- [ ] Display empty state when no pre-approvals
- [ ] Implement pagination if list is large
- [ ] Show pre-approval status badge with color (pending: gray, approved: green, rejected: red, expired: orange)

**Interface:**
```typescript
interface PreApprovalListPageProps {
  // Page component
}

interface PreApprovalListFilters {
  status?: PreApprovalStatus[];
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  search?: string;
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'amount:desc' | 'amount:asc';
}

interface PreApprovalListDto {
  id: string;
  referenceNumber: string;
  estimatedAmount: number;
  currency: string;
  category: { id: string; name: string };
  purpose: string;
  status: PreApprovalStatus;
  validUntil: string;
  isUsed: boolean;
  linkedExpenseCount: number;
  requestedAt: string;
  approvedAt?: string;
  daysUntilExpiry?: number;
}

interface PreApprovalListResponse {
  data: PreApprovalListDto[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}
```

**Page Tests:**
```typescript
// Test cases:
- [ ] List displays pre-approvals in table
- [ ] Status filter works correctly
- [ ] Date range filter restricts results
- [ ] Category filter works
- [ ] Sorting by different columns works
- [ ] Pagination controls work
- [ ] Used indicator shows for linked expenses
- [ ] Expiry countdown displays correctly
- [ ] Quick action button triggers create expense flow
- [ ] Detail link navigates to detail page
- [ ] Empty state displays when no results
- [ ] Status badge colors correct
```

---

#### Task 10.2.2: Expense Linking from Pre-Approval
**File:** `packages/web/src/components/preapproval/ExpenseFromPreApprovalModal.tsx` and hook updates

**Acceptance Criteria:**
- [ ] When user clicks "Create Expense" from pre-approval, show modal/overlay
- [ ] Display pre-approval summary: amount, category, purpose, valid until
- [ ] Show validation message if pre-approval is expired
- [ ] Validate that expense amount does not exceed pre-approval amount
- [ ] Show warning if expense amount exceeds pre-approval (allow override with confirmation)
- [ ] Auto-populate expense form with category from pre-approval
- [ ] Auto-populate purpose/description from pre-approval
- [ ] Link created expense to pre-approval record
- [ ] Show message: "This expense is linked to pre-approval {reference}"
- [ ] Mark pre-approval as "used" when first expense is linked
- [ ] Allow multiple expenses to link to single pre-approval (sum validation)
- [ ] Show total used amount vs. pre-approved amount
- [ ] Implement "Edit pre-approval linked expenses" page

**Interface:**
```typescript
interface ExpenseFromPreApprovalModalProps {
  preApproval: PreApprovalResponse;
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated?: (expenseId: string) => void;
}

interface PreApprovalLinkValidation {
  isExpired: boolean;
  expiresAt?: string;
  remainingAmount: number;
  totalLinkedAmount: number;
  linkedExpenseCount: number;
  canCreateExpense: boolean;
  validationWarnings: string[];
}

interface LinkedExpenseInfo {
  expenseId: string;
  amount: number;
  currency: string;
  linkedAt: string;
  status: ExpenseStatus;
}

interface PreApprovalWithLinkedExpenses extends PreApprovalResponse {
  linkedExpenses: LinkedExpenseInfo[];
  totalLinkedAmount: number;
  remainingAmount: number;
  percentUsed: number;
}
```

**Hook Interface - `usePreApprovalValidation.ts`:**
```typescript
interface UsePreApprovalValidationOptions {
  preApproval: PreApprovalResponse;
  expenseAmount?: number;
}

interface UsePreApprovalValidationReturn {
  validation: PreApprovalLinkValidation;
  isValid: (amount: number) => boolean;
  getRemainingAmount: () => number;
  getUsagePercentage: () => number;
  validateExpenseAmount: (amount: number) => ValidationError[];
}

interface ValidationError {
  type: 'EXPIRED' | 'EXCEEDED_AMOUNT' | 'INVALID_CATEGORY';
  message: string;
  severity: 'warning' | 'error';
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Modal displays pre-approval summary
- [ ] Expired pre-approval shows error message
- [ ] Expense amount validation works
- [ ] Warning shows if amount exceeds pre-approval
- [ ] Override confirmation required for exceeding
- [ ] Form auto-populated with category and purpose
- [ ] Expense successfully linked to pre-approval
- [ ] Pre-approval marked as used after first expense
- [ ] Multiple expenses can link to same pre-approval
- [ ] Total usage amount validated correctly
- [ ] Usage percentage calculated correctly

// Hook Tests:
- [ ] Validation runs on mount
- [ ] isValid() returns correct boolean
- [ ] getRemainingAmount() calculates correctly
- [ ] getUsagePercentage() calculates correctly
- [ ] validateExpenseAmount() catches errors
```

---

# Epic 11: Notifications

**Priority:** P3 (Nice-to-have)
**Branch:** `feature/epic-11-notifications`
**Estimated Complexity:** Medium
**Agent:** frontend-engineer

---

## Overview

Implement a comprehensive notification system with both in-app notifications and email notification preferences. Users receive notifications for important events (expense approved, expense rejected, new approval request, comment added, etc.) and can customize when and how they receive these notifications.

### Dependencies
- **Depends On:** Epic 1 (UI Components), Epic 3 (Expense Management), Epic 4 (Approval Workflow)
- **Blocks:** None
- **Backend Services Required:**
  - Get notifications API (`GET /notifications`)
  - Mark notification as read (`PUT /notifications/{id}/read`)
  - Delete notification (`DELETE /notifications/{id}`)
  - Get notification preferences (`GET /notification-preferences`)
  - Update notification preferences (`PUT /notification-preferences`)

### Files to Create/Update
```
packages/web/src/
├── components/notifications/
│   ├── NotificationBell.tsx (NEW)
│   ├── NotificationPanel.tsx (NEW)
│   ├── NotificationItem.tsx (NEW)
│   ├── NotificationFilter.tsx (NEW)
│   ├── NotificationPreferencesPanel.tsx (NEW)
│   ├── PreferenceCategorySection.tsx (NEW)
│   ├── PreferenceToggle.tsx (NEW)
│   └── index.ts (barrel export)
├── pages/
│   └── NotificationSettingsPage.tsx (NEW)
├── features/notifications/services/
│   └── notifications.service.ts (NEW - RTK Query service)
├── hooks/
│   ├── useNotifications.ts (NEW)
│   ├── useNotificationPreferences.ts (NEW)
│   └── useWebSocket.ts (NEW - for real-time notifications)
└── types/
    └── notifications.types.ts (NEW)
```

---

## Story 11.1: In-App Notifications

Implement the notification center UI with real-time updates and notification management.

### Context to Load
```
packages/web/src/components/ui/ (Badge, Card, Skeleton, Modal, EmptyState, Spinner)
packages/web/src/store/ (Redux store for notification state)
packages/api/src/modules/notifications/dto/*.ts (Notification DTOs)
Browser WebSocket API for real-time updates
```

### Tasks

#### Task 11.1.1: NotificationBell Component
**File:** `packages/web/src/components/notifications/NotificationBell.tsx`

**Acceptance Criteria:**
- [ ] Render bell icon in main layout header
- [ ] Show red badge with unread notification count
- [ ] Hide badge if no unread notifications
- [ ] Implement click handler to toggle notification panel
- [ ] Show loading state while fetching notifications
- [ ] Highlight/pulse animation when new notification arrives
- [ ] Keyboard accessible (Enter/Space to open panel, ESC to close)
- [ ] ARIA labels for accessibility
- [ ] Position bell icon in top-right area of header
- [ ] Responsive sizing for mobile/tablet/desktop
- [ ] Show tooltip "You have X unread notifications"
- [ ] Implement keyboard shortcut (Cmd/Ctrl+N) to toggle panel

**Interface:**
```typescript
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isOpen?: boolean;
  isLoading?: boolean;
  position?: 'header' | 'sidebar';
}

interface NotificationBellState {
  isOpen: boolean;
  isLoading: boolean;
  unreadCount: number;
  hasNewNotification: boolean; // for animation trigger
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Bell icon renders
- [ ] Badge shows unread count
- [ ] Badge hides if count is 0
- [ ] Click opens notification panel
- [ ] Loading state shows spinner
- [ ] Animation plays on new notification
- [ ] Keyboard shortcuts work (Cmd+N)
- [ ] ESC closes panel
- [ ] ARIA labels present
- [ ] Tooltip displays unread count
- [ ] Responsive sizing works
```

---

#### Task 11.1.2: NotificationPanel Component
**File:** `packages/web/src/components/notifications/NotificationPanel.tsx`

**Acceptance Criteria:**
- [ ] Render scrollable dropdown panel below bell icon
- [ ] Display "Notifications" header with close button
- [ ] Fetch and display list of notifications from API
- [ ] Show most recent notifications first (reverse chronological)
- [ ] Display each notification with NotificationItem component
- [ ] Implement "Mark all as read" button in header
- [ ] Implement "Clear all" button to delete all notifications
- [ ] Show loading skeleton while fetching
- [ ] Implement infinite scroll or "Load more" button for older notifications
- [ ] Display empty state when no notifications ("You're all caught up!")
- [ ] Show unread count next to header title
- [ ] Click on notification to mark as read and navigate to related entity
- [ ] Right-click context menu for additional actions (delete, mute similar)
- [ ] Show loading indicator at bottom while loading more
- [ ] Dismiss notification by clicking close button on item
- [ ] Responsive sizing: should fit in viewport without scrolling entire page
- [ ] Remember scroll position when panel is reopened

**Interface:**
```typescript
interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  maxNotifications?: number; // default 20
  autoClose?: boolean; // close after clicking notification
}

interface NotificationPanelState {
  notifications: NotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  nextCursor?: string; // for pagination
}

interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  avatar?: string;
  isRead: boolean;
  createdAt: string;
  relatedEntity?: {
    type: 'EXPENSE' | 'APPROVAL' | 'COMMENT' | 'VOUCHER';
    id: string;
    label?: string;
  };
  action?: {
    label: string;
    href: string;
  };
  metadata?: Record<string, any>; // expense amount, approver name, etc.
}

type NotificationType =
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'EXPENSE_PENDING_APPROVAL'
  | 'APPROVAL_REQUESTED'
  | 'COMMENT_ADDED'
  | 'VOUCHER_APPROVED'
  | 'BUDGET_THRESHOLD_EXCEEDED'
  | 'CLARIFICATION_REQUESTED'
  | 'SYSTEM_MESSAGE';
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Panel renders when open
- [ ] Panel closes when onClose called
- [ ] Notifications load from API
- [ ] Reverse chronological order
- [ ] Each notification rendered with NotificationItem
- [ ] Mark all as read button works
- [ ] Clear all button works
- [ ] Loading skeleton shows
- [ ] Infinite scroll loads more notifications
- [ ] Empty state displays when no notifications
- [ ] Unread count in header updates
- [ ] Click notification marks as read
- [ ] Click navigates to related entity
- [ ] Dismiss button removes notification
- [ ] Panel resizes responsively
- [ ] Scroll position remembered on reopen
```

---

#### Task 11.1.3: NotificationItem Component
**File:** `packages/web/src/components/notifications/NotificationItem.tsx`

**Acceptance Criteria:**
- [ ] Render single notification with proper formatting
- [ ] Display notification type icon (approval, rejection, comment, etc.)
- [ ] Show notification title and preview text (truncate to 2 lines)
- [ ] Display relative time format ("2 hours ago", "just now")
- [ ] Show visual indicator for unread items (blue dot or bold text)
- [ ] Highlight entire row if unread
- [ ] Display user avatar/icon if applicable
- [ ] Show action button/link if applicable (e.g., "View Expense")
- [ ] Implement hover effect (light background)
- [ ] Click item to mark as read and trigger navigation
- [ ] Include close/dismiss button on right side
- [ ] Show metadata when relevant (amount for expense notification, etc.)
- [ ] Accessible with proper semantic HTML and ARIA attributes
- [ ] Responsive layout for mobile/tablet/desktop

**Interface:**
```typescript
interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead?: (id: string) => Promise<void>;
  onDismiss?: (id: string) => Promise<void>;
  onClick?: () => void;
  isLoading?: boolean;
}

interface NotificationItemState {
  isHovered: boolean;
  isDismissing: boolean;
}

// Icon mapping for notification types
type NotificationIconType =
  | 'check-circle' // approved
  | 'x-circle' // rejected
  | 'clock' // pending
  | 'message-square' // comment
  | 'alert-circle' // warning
  | 'info' // general info
  | 'users' // approval request;

interface NotificationMetadata {
  expenseAmount?: number;
  expenseCurrency?: string;
  expenseDescription?: string;
  approverName?: string;
  vendorName?: string;
  categoryName?: string;
  voucherAmount?: number;
  budgetPercentage?: number;
  commentText?: string;
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Notification renders with all fields
- [ ] Correct icon for notification type
- [ ] Title and preview text display correctly
- [ ] Relative time format correct
- [ ] Unread indicator shows blue dot
- [ ] Unread items highlighted
- [ ] Avatar displays when present
- [ ] Action button shows and links correctly
- [ ] Click marks as read
- [ ] Click navigates to entity
- [ ] Dismiss button removes notification
- [ ] Hover effect applies
- [ ] Metadata displays correctly
- [ ] Accessibility attributes present
- [ ] Responsive layout works
```

---

## Story 11.2: Notification Preferences

Implement settings page for users to customize notification frequency and channels.

### Tasks

#### Task 11.2.1: NotificationSettingsPage
**File:** `packages/web/src/pages/NotificationSettingsPage.tsx`

**Acceptance Criteria:**
- [ ] Display page title "Notification Settings"
- [ ] Show breadcrumb navigation (Dashboard > Settings > Notifications)
- [ ] Divide settings into two main sections: Email Notifications and In-App Notifications
- [ ] Email section shows: toggle for email notifications, digest frequency selector, email address display
- [ ] Email digest frequency options: Immediate, Daily, Weekly, Never
- [ ] In-app section shows: toggle for in-app notifications, enable desktop notifications toggle
- [ ] Below each section, list toggles for individual event types
- [ ] Group event toggles by category: Expenses, Approvals, Comments, System
- [ ] Show "Toggle All" switch in each category header
- [ ] Each event toggle with descriptive label and example
- [ ] Auto-save settings on toggle change (show confirmation message)
- [ ] Show loading state while saving
- [ ] Display error message if save fails with retry option
- [ ] Include "Reset to defaults" button to restore original settings
- [ ] Show last updated timestamp at bottom
- [ ] Responsive layout for mobile/tablet/desktop
- [ ] Preserve scroll position when returning to page

**Interface:**
```typescript
interface NotificationSettingsPageProps {
  // Page component
}

interface NotificationPreferences {
  id: string;
  userId: string;
  email: {
    enabled: boolean;
    digestFrequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'NEVER';
    emailAddress: string;
  };
  inApp: {
    enabled: boolean;
    enableDesktop: boolean;
  };
  eventPreferences: EventPreference[];
  updatedAt: string;
  createdAt: string;
}

interface EventPreference {
  eventType: NotificationType;
  email: boolean;
  inApp: boolean;
  category: PreferenceCategory;
  label: string;
  description: string;
}

type PreferenceCategory = 'EXPENSES' | 'APPROVALS' | 'COMMENTS' | 'SYSTEM';

interface PreferenceUpdate {
  eventType: NotificationType;
  channel: 'email' | 'inApp';
  enabled: boolean;
}
```

**Page Tests:**
```typescript
// Test cases:
- [ ] Page renders with all sections
- [ ] Email section toggles work
- [ ] Digest frequency selector works
- [ ] In-app section toggles work
- [ ] Individual event toggles work
- [ ] Category toggles control all events in category
- [ ] Settings auto-save on change
- [ ] Loading indicator shows during save
- [ ] Error message shows if save fails
- [ ] Retry button resends failed request
- [ ] Reset to defaults button works
- [ ] Last updated timestamp displays
- [ ] Responsive layout works
- [ ] Scroll position preserved
```

---

#### Task 11.2.2: PreferenceCategorySection Component
**File:** `packages/web/src/components/notifications/PreferenceCategorySection.tsx`

**Acceptance Criteria:**
- [ ] Accept category name and event list as props
- [ ] Render collapsible category header with section title
- [ ] Show "Toggle All" switch in header to enable/disable all events
- [ ] Display list of event preference toggles below header
- [ ] Implement toggle controls using PreferenceToggle component
- [ ] Show count of enabled events in category
- [ ] Indent child toggles under category header
- [ ] Smooth collapse/expand animation
- [ ] Auto-expand if no events are currently disabled
- [ ] Maintain separate toggle state for email and in-app
- [ ] Callback when any toggle changes
- [ ] Accessible with proper semantic HTML and keyboard navigation
- [ ] Responsive layout

**Interface:**
```typescript
interface PreferenceCategorySectionProps {
  category: PreferenceCategory;
  categoryLabel: string;
  events: EventPreference[];
  onEventChange?: (eventType: NotificationType, channel: 'email' | 'inApp', enabled: boolean) => Promise<void>;
  isLoading?: boolean;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

interface PreferenceCategorySectionState {
  isExpanded: boolean;
  isTogglingAll: boolean;
  enabledCount: {
    email: number;
    inApp: number;
  };
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Section renders with category title
- [ ] Toggle All switch visible
- [ ] Child event toggles display
- [ ] Collapse/expand animation works
- [ ] Toggle All enables/disables all events
- [ ] Individual event toggles work
- [ ] Enabled event count displays
- [ ] Loading state disables toggles
- [ ] Callback fires on toggle change
- [ ] Keyboard navigation works
- [ ] Responsive layout works
```

---

#### Task 11.2.3: PreferenceToggle Component
**File:** `packages/web/src/components/notifications/PreferenceToggle.tsx`

**Acceptance Criteria:**
- [ ] Render single event preference toggle item
- [ ] Show toggle switch for email channel on left
- [ ] Show toggle switch for in-app channel on right
- [ ] Display event label and description
- [ ] Show example text ("e.g., sent when expense is approved")
- [ ] Support loading state (disable toggles while saving)
- [ ] Show error indicator if save failed
- [ ] Implement tooltips explaining each channel
- [ ] Keyboard accessible (Tab to focus, Space to toggle)
- [ ] ARIA labels describing event and channel
- [ ] Responsive layout stacking switches on mobile
- [ ] Smooth toggle animation
- [ ] Show pending indicator while saving (optional)

**Interface:**
```typescript
interface PreferenceToggleProps {
  event: EventPreference;
  onEmailToggle?: (enabled: boolean) => Promise<void>;
  onInAppToggle?: (enabled: boolean) => Promise<void>;
  isLoading?: boolean;
  isSaving?: {
    email?: boolean;
    inApp?: boolean;
  };
}

interface PreferenceToggleState {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  emailSaving: boolean;
  inAppSaving: boolean;
  error?: string;
}
```

**Component Tests:**
```typescript
// Test cases:
- [ ] Component renders with event info
- [ ] Email toggle works
- [ ] In-app toggle works
- [ ] Callbacks fire on toggle
- [ ] Loading state disables toggles
- [ ] Description displays
- [ ] Example text shows
- [ ] Tooltips appear on hover
- [ ] Keyboard navigation works
- [ ] Toggle animation smooth
- [ ] ARIA labels present
- [ ] Responsive layout works
```

---

## Hook: useNotifications

**File:** `packages/web/src/hooks/useNotifications.ts`

Centralized hook for managing notification state and API interactions.

**Interface:**
```typescript
interface UseNotificationsReturn {
  // State
  notifications: NotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;

  // Actions
  fetchNotifications: (cursor?: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;

  // Real-time
  isConnected: boolean;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;

  // Utils
  getNotificationIcon: (type: NotificationType) => string;
  formatNotificationTime: (date: string) => string;
}

interface UseNotificationsOptions {
  autoFetch?: boolean;
  autoSubscribe?: boolean;
  pollingInterval?: number; // fallback if WebSocket unavailable
}
```

---

## Hook: useNotificationPreferences

**File:** `packages/web/src/hooks/useNotificationPreferences.ts`

Hook for managing user notification preferences.

**Interface:**
```typescript
interface UseNotificationPreferencesReturn {
  // State
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  error?: string;

  // Actions
  fetchPreferences: () => Promise<void>;
  updateEventPreference: (
    eventType: NotificationType,
    channel: 'email' | 'inApp',
    enabled: boolean
  ) => Promise<void>;
  updateEmailDigestFrequency: (frequency: DigestFrequency) => Promise<void>;
  toggleEmailNotifications: (enabled: boolean) => Promise<void>;
  toggleInAppNotifications: (enabled: boolean) => Promise<void>;
  toggleDesktopNotifications: (enabled: boolean) => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Utils
  isEventEnabled: (eventType: NotificationType, channel: 'email' | 'inApp') => boolean;
  getCategoryEnabledCount: (category: PreferenceCategory, channel: 'email' | 'inApp') => number;
  hasChanges: boolean;
}
```

---

## WebSocket Service for Real-Time Notifications

**File:** `packages/web/src/hooks/useWebSocket.ts`

Hook for WebSocket connection to receive real-time notifications.

**Interface:**
```typescript
interface UseWebSocketOptions {
  url?: string; // WebSocket URL, defaults to current domain
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  unsubscribe: (event: string, callback: (data: any) => void) => void;
  send: (event: string, data: any) => void;
}

// WebSocket Events
type WebSocketEventType =
  | 'notification:new'
  | 'notification:read'
  | 'user:status'
  | 'approval:updated'
  | 'expense:updated';
```

---

## Integration Testing Checklist

### Epic 9: OCR Integration
- [ ] Receipt upload via file picker works
- [ ] Camera access granted and photo captured
- [ ] OCR processing completes within timeout
- [ ] Extracted data displays with confidence scores
- [ ] Auto-population fills form correctly
- [ ] User can edit auto-filled values
- [ ] Receipt gallery loads and displays thumbnails
- [ ] Lightbox opens and navigates between receipts
- [ ] Pan and zoom functionality works
- [ ] Annotations overlay displays correctly

### Epic 10: Pre-Approval Workflow
- [ ] User can create pre-approval request with validation
- [ ] Request submits to API and returns confirmation
- [ ] Pre-approval list displays with filtering and sorting
- [ ] Status badges display correctly
- [ ] Expiry countdown calculates properly
- [ ] Create expense from pre-approval flow works
- [ ] Expense amount validation against pre-approval
- [ ] Multiple expenses link to single pre-approval
- [ ] Usage percentage calculates correctly
- [ ] Pre-approval validation prevents invalid submissions

### Epic 11: Notifications
- [ ] Unread notification count displays in bell badge
- [ ] Clicking bell opens notification panel
- [ ] Notifications load and display in list
- [ ] Clicking notification marks as read
- [ ] Clicking notification navigates to entity
- [ ] Mark all as read button works
- [ ] Infinite scroll loads older notifications
- [ ] WebSocket receives new notifications in real-time
- [ ] Notification preferences page loads and saves
- [ ] Event toggle switches work correctly
- [ ] Email digest frequency updates
- [ ] Reset to defaults button works

---

## E2E Testing Checklist

### Epic 9: OCR Integration
- [ ] User flow: Upload receipt → Extract data → Auto-populate form → Submit expense
- [ ] User flow: Mobile receipt capture → OCR → Form population
- [ ] User flow: View receipt gallery → Open lightbox → Navigate images → Download
- [ ] Error handling: OCR timeout, file upload failure, extraction error
- [ ] Cross-browser: Test on Chrome, Firefox, Safari

### Epic 10: Pre-Approval Workflow
- [ ] User flow: Create pre-approval → Wait approval → Link to expense → Submit
- [ ] User flow: Multi-trip scenario with multiple pre-approvals
- [ ] User flow: Exceed pre-approval amount and override
- [ ] User flow: Pre-approval expires and prevent expense creation
- [ ] Error handling: Invalid data, API failures

### Epic 11: Notifications
- [ ] User flow: Expense approved → notification received → click → view expense
- [ ] User flow: Adjust notification preferences → stop receiving emails → receive in-app only
- [ ] User flow: Real-time notification arrives while user on page
- [ ] User flow: Desktop notification permissions → desktop notification shown
- [ ] Error handling: WebSocket disconnect, API failures, permission denied

---

## Dependency Notes

### Epic 9 Dependencies
- Requires backend receipt upload API
- Requires OCR service integration (AWS Textract or similar)
- Requires confident extraction confidence scoring

### Epic 10 Dependencies
- Requires backend pre-approval approval workflow
- Must handle same approval tier logic as expense approvals
- Requires category linking and validation

### Epic 11 Dependencies
- Requires backend notification queue/service
- WebSocket support on backend for real-time updates
- Email service integration for digest emails
- Database schema for notification preferences

---

## Performance Considerations

### Epic 9: OCR Integration
- Lazy load receipt gallery thumbnails with intersection observer
- Compress receipt images before upload
- Cache extracted data to avoid re-processing
- Implement progressive image loading in lightbox

### Epic 10: Pre-Approval Workflow
- Paginate pre-approval list with infinite scroll
- Cache pre-approval summary data
- Debounce pre-approval amount validation

### Epic 11: Notifications
- Implement notification polling fallback if WebSocket unavailable
- Lazy load notification panel content
- Clear old notifications (>30 days) periodically
- Debounce mark-as-read API calls (batch updates)
- Cache notification preferences locally

---

## Accessibility Requirements

### All Epics
- [ ] All interactive elements keyboard accessible (Tab, Enter, Space, Escape)
- [ ] Proper ARIA labels for icons and buttons
- [ ] Semantic HTML (buttons, links, form elements)
- [ ] Color not the only indicator (use icons/text/patterns)
- [ ] Sufficient contrast ratios (WCAG AA standard)
- [ ] Focus indicators visible
- [ ] Loading states announced via aria-live
- [ ] Error messages associated with form fields
- [ ] Mobile touch targets at least 44x44px

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers: iOS Safari 14+, Android Chrome 90+

---

## Notes

These three epics represent the advanced feature tier and can be developed in parallel or sequentially based on team capacity. They do not block the core functionality (Epics 1-8) but significantly enhance the user experience.

