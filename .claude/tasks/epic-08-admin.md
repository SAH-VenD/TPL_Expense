# Epic 8: Administration

**Priority:** P2 (Important)
**Branch:** `feature/epic-08-admin`
**Estimated Complexity:** High
**Agent:** frontend-engineer

---

## Overview

Implement comprehensive administration features for the TPL Expense system. This epic enables administrators to manage hierarchical data structures (categories, departments), configure approval workflows, adjust system settings, and audit user actions. All pages integrate with real backend APIs and require role-based access control.

### Dependencies
- **Depends On:** Epic 1 (Stories 1.2, 1.3, 1.4) - Requires DataTable, Modal, Card, Badge, Tabs, ConfirmDialog components
- **Blocks:** None (can be developed in parallel with other P2 epics, but depends on Epic 1 UI components)

### Backend API Integration
Uses `adminApi` from `packages/web/src/features/admin/services/admin.service.ts`:
- Category Management: `GET /admin/categories`, `POST /admin/categories`, `PUT /admin/categories/{id}`, `DELETE /admin/categories/{id}`
- Department Management: `GET /admin/departments`, `POST /admin/departments`, `PUT /admin/departments/{id}`, `DELETE /admin/departments/{id}`
- Approval Tiers: `GET /admin/approval-tiers`, `POST /admin/approval-tiers`, `PUT /admin/approval-tiers/{id}`, `DELETE /admin/approval-tiers/{id}`
- System Settings: `GET /admin/settings`, `PATCH /admin/settings`
- Audit Logs: `GET /admin/audit-logs` with filtering and pagination

### Files to Create/Update
```
packages/web/src/
├── pages/admin/
│   ├── AdminDashboard.tsx (NEW)
│   ├── CategoriesPage.tsx (NEW)
│   ├── DepartmentsPage.tsx (NEW)
│   ├── ApprovalTiersPage.tsx (NEW)
│   ├── SettingsPage.tsx (NEW)
│   └── AuditLogsPage.tsx (NEW)
├── components/admin/
│   ├── TreeView.tsx (NEW - reusable)
│   ├── TreeNode.tsx (NEW)
│   ├── CategoryForm.tsx (NEW)
│   ├── DepartmentForm.tsx (NEW)
│   ├── TierForm.tsx (NEW)
│   ├── SettingsForm.tsx (NEW)
│   ├── AuditLogEntry.tsx (NEW)
│   ├── DiffView.tsx (NEW)
│   └── index.ts (barrel export)
├── features/admin/services/
│   └── admin.service.ts (NEW or UPDATE - RTK Query API)
└── hooks/
    ├── useTreeViewState.ts (NEW)
    └── useAuditLogFilters.ts (NEW)
```

---

## Story 8.1: Categories Management

Implement hierarchical category management with tree view display, inline editing, and drag-drop reordering.

### Context to Load
```
packages/web/src/features/admin/services/admin.service.ts (RTK Query service)
packages/api/src/modules/categories/dto/*.ts (Category DTOs)
packages/web/src/components/ui/ (Modal, Card, ConfirmDialog, etc.)
packages/web/src/store/hooks.ts (useAppDispatch, useAppSelector)
```

### Tasks

#### Task 8.1.1: CategoriesPage with TreeView
**File:** `packages/web/src/pages/admin/CategoriesPage.tsx`

**Acceptance Criteria:**
- [ ] Page header: "Categories Management" with breadcrumb (Admin > Categories)
- [ ] TreeView component displaying hierarchical category structure
- [ ] Load categories on mount via `getCategories` API call
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button on API failure
- [ ] Add root category button at top of page
- [ ] Each category node shows:
  - [ ] Category name with optional icon
  - [ ] Active/inactive indicator
  - [ ] Number of child categories
  - [ ] Expandable/collapsible chevron
- [ ] Node actions menu on hover (edit, delete, add child)
- [ ] Drag-drop reordering (drag node to reorder within same parent)
- [ ] Search/filter input to find nodes by name (highlights matching nodes)
- [ ] Expanded state persists in localStorage (key: 'admin_categories_expanded')
- [ ] Response time < 500ms after interactions

**API Contract:**
```typescript
// GET /admin/categories
interface GetCategoriesResponse {
  data: CategoryTreeDto[];
  meta: {
    total: number;
  };
}

interface CategoryTreeDto {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  parentId?: string;
  children?: CategoryTreeDto[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

// PUT /admin/categories/{id}/reorder
interface ReorderCategoryRequest {
  parentId?: string;
  order: number;
}
```

**Interface:**
```typescript
interface CategoriesPageState {
  searchQuery?: string;
  expandedNodes: Set<string>;
  isDragging: boolean;
  draggedNode?: CategoryTreeDto;
}
```

---

#### Task 8.1.2: CategoryForm Modal
**File:** `packages/web/src/components/admin/CategoryForm.tsx`

**Acceptance Criteria:**
- [ ] Modal form for creating/editing categories
- [ ] Name input field (required, max 100 chars)
- [ ] Description textarea (optional, max 500 chars)
- [ ] Parent category selector dropdown (searchable, with "None" for root)
- [ ] Active/inactive toggle switch
- [ ] Icon selector with common icons (optional, dropdown or popover)
- [ ] Form validation with error messages
- [ ] Submit button (Create / Update based on mode)
- [ ] Cancel button
- [ ] Uses React Hook Form + Zod validation
- [ ] Show loading spinner while submitting
- [ ] Show success toast after submit
- [ ] Show error toast on API failure
- [ ] Disable parent selector when editing (prevent circular references)

**Interface:**
```typescript
interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: CategoryTreeDto;
  parentId?: string;
  categories: CategoryTreeDto[];
  onSubmit: (data: CreateCategoryDto | UpdateCategoryDto) => Promise<void>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

interface CategoryFormData {
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  icon?: string;
}

interface CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  icon?: string;
}

interface UpdateCategoryDto extends CreateCategoryDto {
  id: string;
}
```

**Zod Schema:**
```typescript
const CategoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
  icon: z.string().optional(),
});
```

---

#### Task 8.1.3: TreeView Component (Reusable)
**Files:**
- `packages/web/src/components/admin/TreeView.tsx` (NEW)
- `packages/web/src/components/admin/TreeNode.tsx` (NEW)

**Acceptance Criteria:**
- [ ] Renders hierarchical tree structure from flat array with parent/child relationships
- [ ] Expandable/collapsible nodes with animated chevron icon
- [ ] Indent levels showing hierarchy depth
- [ ] Node actions menu on hover with custom items
- [ ] Drag-drop reordering support (with drag handle)
- [ ] Search/filter functionality (highlights matching nodes, expands parents)
- [ ] Custom node renderer via render prop
- [ ] Keyboard navigation (arrow keys, enter, space)
- [ ] Accessibility: ARIA attributes for tree role
- [ ] Callback props: onNodeClick, onDragEnd, onActionClick
- [ ] Loading state for lazy-loaded children
- [ ] Smooth animations for expand/collapse and reorder

**Interfaces:**
```typescript
interface TreeViewProps<T extends { id: string; parentId?: string; children?: T[] }> {
  data: T[];
  onNodeClick?: (node: T) => void;
  onDragEnd?: (node: T, newParentId?: string, newIndex: number) => Promise<void>;
  onActionClick?: (action: string, node: T) => void;
  actionMenuItems?: TreeAction[];
  renderNode?: (node: T, isExpanded: boolean) => React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isDraggable?: boolean;
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

interface TreeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (node: any) => void;
  variant?: 'default' | 'danger';
  disabled?: (node: any) => boolean;
}

interface TreeNodeProps<T> {
  node: T;
  level: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  renderNode?: (node: T) => React.ReactNode;
  actionMenuItems?: TreeAction[];
}
```

---

## Story 8.2: Departments Management

Implement hierarchical department management with tree view, head assignment, and budget linking.

### Context to Load
```
packages/api/src/modules/departments/dto/*.ts (Department DTOs)
packages/web/src/features/admin/services/admin.service.ts
packages/web/src/components/admin/TreeView.tsx (from Story 8.1.3)
packages/web/src/features/users/services/ (user list for head assignment)
```

### Tasks

#### Task 8.2.1: DepartmentsPage with TreeView
**File:** `packages/web/src/pages/admin/DepartmentsPage.tsx`

**Acceptance Criteria:**
- [ ] Page header: "Departments Management" with breadcrumb
- [ ] TreeView component displaying hierarchical department structure
- [ ] Load departments on mount via `getDepartments` API call
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button
- [ ] Add root department button
- [ ] Each department node shows:
  - [ ] Department name and code (e.g., "IT - IT001")
  - [ ] Department head name (if assigned)
  - [ ] Number of child departments
  - [ ] Active/inactive indicator
- [ ] Node actions menu on hover (edit, delete, add child)
- [ ] Drag-drop reordering within hierarchy
- [ ] Search/filter input for department name or code
- [ ] Expanded state persists in localStorage (key: 'admin_departments_expanded')
- [ ] Link to associated budget from node (if exists)

**API Contract:**
```typescript
// GET /admin/departments
interface GetDepartmentsResponse {
  data: DepartmentTreeDto[];
  meta: {
    total: number;
  };
}

interface DepartmentTreeDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  children?: DepartmentTreeDto[];
  departmentHead?: {
    id: string;
    name: string;
    email: string;
  };
  budgetId?: string;
  budget?: {
    id: string;
    name: string;
    amount: number;
  };
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

#### Task 8.2.2: DepartmentForm Modal
**File:** `packages/web/src/components/admin/DepartmentForm.tsx`

**Acceptance Criteria:**
- [ ] Modal form for creating/editing departments
- [ ] Name input field (required, max 100 chars)
- [ ] Code input field (required, max 10 chars, uppercase, alphanumeric)
- [ ] Description textarea (optional)
- [ ] Parent department selector dropdown (searchable)
- [ ] Department head user selector (searchable dropdown, required for non-root)
- [ ] Budget assignment selector (optional, shows existing budgets)
- [ ] Active/inactive toggle
- [ ] Code must be unique (validate on backend)
- [ ] Submit button (Create / Update)
- [ ] Uses React Hook Form + Zod
- [ ] Show loading spinner while submitting
- [ ] Show error/success toasts

**Interface:**
```typescript
interface DepartmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: DepartmentTreeDto;
  departments: DepartmentTreeDto[];
  users: User[];
  budgets: Budget[];
  onSubmit: (data: CreateDepartmentDto | UpdateDepartmentDto) => Promise<void>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

interface DepartmentFormData {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  departmentHeadId?: string;
  budgetId?: string;
  isActive: boolean;
}
```

---

## Story 8.3: Approval Tiers Management

Implement sortable list of approval tiers with role-based assignment.

### Context to Load
```
packages/api/src/modules/approvals/dto/*.ts (ApprovalTier DTOs)
packages/web/src/features/admin/services/admin.service.ts
packages/web/src/components/ui/DataTable.tsx
```

### Tasks

#### Task 8.3.1: ApprovalTiersPage with Sortable List
**File:** `packages/web/src/pages/admin/ApprovalTiersPage.tsx`

**Acceptance Criteria:**
- [ ] Page header: "Approval Tiers Management" with breadcrumb
- [ ] Sortable table/list of approval tiers
- [ ] Columns: Tier Level, Name, Min Amount, Max Amount, Required Role, Auto-Approve Threshold, Actions
- [ ] Load tiers on mount via `getApprovalTiers` API call
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button
- [ ] Add new tier button (opens TierForm modal)
- [ ] Drag-drop reordering tiers (updates tier order on backend)
- [ ] Each row has edit and delete buttons
- [ ] Delete with confirmation dialog (checks if tier is in use)
- [ ] Reorder persistence (drag updates backend immediately)
- [ ] Display amount thresholds with currency formatting
- [ ] Pagination if many tiers (> 20)
- [ ] Show validation errors (e.g., overlapping ranges)

**API Contract:**
```typescript
// GET /admin/approval-tiers
interface GetApprovalTiersResponse {
  data: ApprovalTierDto[];
  meta: {
    total: number;
  };
}

interface ApprovalTierDto {
  id: string;
  name: string;
  tier: number;
  minAmount: number;
  maxAmount: number;
  requiredRoles: RoleType[];
  autoApproveThreshold?: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// PUT /admin/approval-tiers/reorder
interface ReorderTierRequest {
  tierId: string;
  newOrder: number;
}
```

**Interface:**
```typescript
interface ApprovalTiersPageState {
  tiers: ApprovalTierDto[];
  isDragging: boolean;
  draggedTierId?: string;
}
```

---

#### Task 8.3.2: TierForm Modal
**File:** `packages/web/src/components/admin/TierForm.tsx`

**Acceptance Criteria:**
- [ ] Modal form for creating/editing approval tiers
- [ ] Tier name input (required, max 100 chars)
- [ ] Minimum amount threshold input (required, number >= 0)
- [ ] Maximum amount threshold input (required, number > min)
- [ ] Required approver role multi-select dropdown (APPROVER, FINANCE, ADMIN)
- [ ] Auto-approve threshold checkbox + input (optional, for automatic approval up to amount)
- [ ] Validation:
  - [ ] Max amount > Min amount
  - [ ] Amount ranges don't overlap with existing tiers
  - [ ] At least one role selected
- [ ] Submit button (Create / Update)
- [ ] Show error messages for validation
- [ ] Uses React Hook Form + Zod
- [ ] Show loading spinner while submitting

**Interface:**
```typescript
interface TierFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: ApprovalTierDto;
  existingTiers?: ApprovalTierDto[];
  onSubmit: (data: CreateTierDto | UpdateTierDto) => Promise<void>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

interface TierFormData {
  name: string;
  minAmount: number;
  maxAmount: number;
  requiredRoles: RoleType[];
  autoApproveThreshold?: number;
}
```

**Zod Schema:**
```typescript
const TierFormSchema = z.object({
  name: z.string().min(1, 'Tier name is required').max(100),
  minAmount: z.number().min(0, 'Minimum amount must be >= 0'),
  maxAmount: z.number().min(0.01, 'Maximum amount must be > 0'),
  requiredRoles: z.array(z.enum(['APPROVER', 'FINANCE', 'ADMIN'])).min(1, 'At least one role required'),
  autoApproveThreshold: z.number().optional(),
}).refine(
  (data) => data.maxAmount > data.minAmount,
  { message: 'Max amount must be greater than min amount', path: ['maxAmount'] }
);
```

---

## Story 8.4: System Settings

Implement settings management with different categories and field-level save functionality.

### Context to Load
```
packages/api/src/modules/settings/dto/*.ts (Settings DTOs)
packages/web/src/features/admin/services/admin.service.ts
packages/web/src/components/ui/ (Input, Select, Tabs, etc.)
```

### Tasks

#### Task 8.4.1: SettingsPage with Grouped Settings
**File:** `packages/web/src/pages/admin/SettingsPage.tsx`

**Acceptance Criteria:**
- [ ] Page header: "System Settings" with breadcrumb
- [ ] Horizontal tabs grouping settings by category:
  - [ ] General (app name, default currency, fiscal year start)
  - [ ] Currency & Localization (currency formats, date format, time zone)
  - [ ] Notifications (email notifications enabled, slack integration, etc.)
  - [ ] Security (session timeout, password policy, 2FA requirement)
- [ ] Load settings on mount via `getSettings` API call
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button
- [ ] Each tab contains SettingsForm component
- [ ] Save button per section (or auto-save on change with debounce)
- [ ] Reset to defaults button with confirmation dialog
- [ ] Show success toast after save
- [ ] Show error toast on API failure
- [ ] Input validation with error messages
- [ ] Disable form while saving
- [ ] Unsaved changes indicator (optional)

**API Contract:**
```typescript
// GET /admin/settings
interface GetSettingsResponse {
  data: SystemSettingDto[];
  meta: {
    total: number;
  };
}

interface SystemSettingDto {
  id: string;
  key: string;
  value: string | number | boolean;
  category: 'GENERAL' | 'CURRENCY' | 'NOTIFICATIONS' | 'SECURITY';
  type: 'string' | 'number' | 'boolean' | 'json';
  label: string;
  description?: string;
  isVisible: boolean;
  isEditable: boolean;
  defaultValue: string | number | boolean;
}

// PATCH /admin/settings
interface UpdateSettingsRequest {
  settings: Array<{
    key: string;
    value: string | number | boolean;
  }>;
}
```

**Interface:**
```typescript
interface SettingsPageState {
  activeTab: 'general' | 'currency' | 'notifications' | 'security';
  unsavedChanges: Record<string, boolean>;
}
```

---

#### Task 8.4.2: Settings Forms per Category
**File:** `packages/web/src/components/admin/SettingsForm.tsx`

**Acceptance Criteria:**
- [ ] Dynamic form generation based on setting definitions
- [ ] Support different input types:
  - [ ] Text input for strings
  - [ ] Number input for numbers
  - [ ] Toggle/checkbox for booleans
  - [ ] Select dropdown for enum-like options
  - [ ] Textarea for longer text
- [ ] Field labels and descriptions
- [ ] Inline validation with error messages
- [ ] Save button that calls API with changed values only
- [ ] Reset button to revert to last saved values
- [ ] Loading spinner while saving
- [ ] Show section-specific error/success messages
- [ ] Read-only fields for non-editable settings

**Interface:**
```typescript
interface SettingsFormProps {
  category: 'GENERAL' | 'CURRENCY' | 'NOTIFICATIONS' | 'SECURITY';
  settings: SystemSettingDto[];
  onSave: (updates: Array<{ key: string; value: any }>) => Promise<void>;
  isLoading?: boolean;
}

interface SettingFieldProps {
  setting: SystemSettingDto;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}
```

---

## Story 8.5: Audit Logs

Implement paginated audit log table with filtering, search, and expandable diff view.

### Context to Load
```
packages/api/src/modules/audit/dto/*.ts (AuditLog DTOs)
packages/web/src/features/admin/services/admin.service.ts
packages/web/src/components/ui/DataTable.tsx
```

### Tasks

#### Task 8.5.1: AuditLogsPage with Paginated Table
**File:** `packages/web/src/pages/admin/AuditLogsPage.tsx`

**Acceptance Criteria:**
- [ ] Page header: "Audit Logs" with breadcrumb
- [ ] Paginated table of audit log entries (20 per page default)
- [ ] Columns: Timestamp, Action, Entity, Entity ID, User, Status, Details (expand button)
- [ ] Load logs on mount via `getAuditLogs` API call with pagination
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button
- [ ] Show empty state when no logs match filters
- [ ] Filters in sidebar or filter bar:
  - [ ] Action type dropdown (CREATE, UPDATE, DELETE, SUBMIT, APPROVE, etc.)
  - [ ] User selector dropdown (searchable)
  - [ ] Date range picker (from date, to date)
  - [ ] Entity type dropdown (Expense, Category, Department, etc.)
  - [ ] Search input for entity ID or description
- [ ] Apply Filters button or auto-apply on change
- [ ] Clear filters button
- [ ] Filter state persists in URL query params
- [ ] Pagination controls (prev/next, page size selector, total count)
- [ ] Sort by timestamp (newest first, can reverse)
- [ ] Response time < 500ms

**API Contract:**
```typescript
// GET /admin/audit-logs?page=1&pageSize=20&action=CREATE&userId={id}&dateFrom=2024-01-01&entityType=EXPENSE
interface GetAuditLogsQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  userId?: string;
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  entityType?: string;
  entityId?: string;
  search?: string;
  sort?: 'createdAt:desc' | 'createdAt:asc';
}

interface GetAuditLogsResponse {
  data: AuditLogDto[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

interface AuditLogDto {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'WITHDRAW' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId: string;
  entityName?: string;
  status: 'SUCCESS' | 'FAILURE';
  statusCode?: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  createdAt: string; // ISO datetime
}
```

**Interface:**
```typescript
interface AuditLogsPageState {
  page: number;
  pageSize: number;
  actionFilter?: string;
  userFilter?: string;
  dateFromFilter?: string;
  dateToFilter?: string;
  entityTypeFilter?: string;
  searchQuery?: string;
  sortBy: 'createdAt:desc' | 'createdAt:asc';
}
```

---

#### Task 8.5.2: AuditLogEntry Component with DiffView
**Files:**
- `packages/web/src/components/admin/AuditLogEntry.tsx` (NEW)
- `packages/web/src/components/admin/DiffView.tsx` (NEW)

**Acceptance Criteria for AuditLogEntry:**
- [ ] Displays single audit log entry in table row or card
- [ ] Action type badge with color coding:
  - [ ] CREATE = green
  - [ ] UPDATE = blue
  - [ ] DELETE = red
  - [ ] SUBMIT = purple
  - [ ] APPROVE = green
  - [ ] REJECT = red
  - [ ] WITHDRAW = orange
  - [ ] LOGIN/LOGOUT = gray
- [ ] User info: avatar (if available), name, email (tooltip)
- [ ] Timestamp formatted as:
  - [ ] Relative time (e.g., "2 hours ago")
  - [ ] Full datetime on hover
  - [ ] Timezone-aware
- [ ] Entity link (clickable, navigates to entity detail page if available)
- [ ] Status indicator (success/failure with icon)
- [ ] Expandable section toggle
- [ ] Expand button shows DiffView component

**Acceptance Criteria for DiffView:**
- [ ] Shows "Before" and "After" values side-by-side
- [ ] Changed fields highlighted
- [ ] JSON objects/arrays formatted nicely
- [ ] Large diffs are scrollable
- [ ] Handles null/undefined values gracefully
- [ ] Date/time values formatted nicely
- [ ] Copy button for before/after values
- [ ] Collapsible sections for nested objects

**Interfaces:**
```typescript
interface AuditLogEntryProps {
  log: AuditLogDto;
  expandedId?: string;
  onToggleExpand?: (id: string) => void;
  isExpanded?: boolean;
}

interface DiffViewProps {
  before?: Record<string, any>;
  after?: Record<string, any>;
  changedFields?: string[];
}

interface FieldDiff {
  field: string;
  before?: any;
  after?: any;
  isChanged: boolean;
}
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file in `__tests__/` folder:

```
packages/web/src/components/admin/__tests__/
├── TreeView.test.tsx
├── TreeNode.test.tsx
├── CategoryForm.test.tsx
├── DepartmentForm.test.tsx
├── TierForm.test.tsx
├── SettingsForm.test.tsx
├── AuditLogEntry.test.tsx
└── DiffView.test.tsx

packages/web/src/pages/admin/__tests__/
├── CategoriesPage.test.tsx
├── DepartmentsPage.test.tsx
├── ApprovalTiersPage.test.tsx
├── SettingsPage.test.tsx
└── AuditLogsPage.test.tsx
```

### Test Cases per Component

#### TreeView Tests
- [ ] Renders tree structure correctly
- [ ] Expand/collapse works
- [ ] Search/filter highlights matching nodes
- [ ] Drag-drop reordering works
- [ ] Action menu items trigger callbacks
- [ ] Keyboard navigation (arrow keys, enter, space)
- [ ] Accessibility: tree role and ARIA attributes

#### TreeNode Tests
- [ ] Renders node with correct indentation
- [ ] Expand/collapse chevron works
- [ ] Action menu appears on hover
- [ ] Drag handle works
- [ ] Callbacks triggered correctly

#### CategoryForm Tests
- [ ] Form renders with all fields
- [ ] Validation errors display
- [ ] Form submission works
- [ ] Parent category selector works
- [ ] Icon selector works

#### DepartmentForm Tests
- [ ] Form renders with all fields
- [ ] Code input validation
- [ ] Department head selector works
- [ ] Budget assignment works
- [ ] Form submission works

#### TierForm Tests
- [ ] Form renders with all fields
- [ ] Amount validation (max > min)
- [ ] Range overlap validation
- [ ] Role multi-select works
- [ ] Form submission works

#### SettingsForm Tests
- [ ] Renders all settings fields
- [ ] Different field types (text, number, toggle, select)
- [ ] Field validation works
- [ ] Save button submits changes
- [ ] Reset button reverts changes
- [ ] Read-only fields are disabled

#### AuditLogEntry Tests
- [ ] Renders log entry correctly
- [ ] Action badge color correct
- [ ] User info displays
- [ ] Timestamp formatted correctly
- [ ] Expand/collapse works
- [ ] Entity link works

#### DiffView Tests
- [ ] Before/after values display
- [ ] Changed fields highlighted
- [ ] JSON formatting works
- [ ] Copy button works
- [ ] Large diffs are scrollable

#### Page Integration Tests
- [ ] Pages render without errors
- [ ] Data loads from API
- [ ] Forms submit correctly
- [ ] Navigation works
- [ ] Error handling works
- [ ] Filters/search works
- [ ] Pagination works (for audit logs)
- [ ] Drag-drop reordering works (for categories/departments/tiers)

### Coverage Target
- Minimum 70% code coverage across components
- All user interactions tested
- All loading/error/empty states tested
- All status-based conditionals tested

---

## Definition of Done

- [ ] All 6 pages implemented (Categories, Departments, Tiers, Settings, AuditLogs, + optional AdminDashboard)
- [ ] All 8 components implemented (TreeView, TreeNode, CategoryForm, DepartmentForm, TierForm, SettingsForm, AuditLogEntry, DiffView)
- [ ] adminApi created/updated with all required endpoints
- [ ] All components exported from `components/admin/index.ts`
- [ ] All pages routed in routing configuration
- [ ] TypeScript interfaces for all props and API contracts
- [ ] Tailwind styling (no inline styles)
- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)
- [ ] Loading skeletons for all data-fetching components
- [ ] Error states with retry functionality
- [ ] Empty states with helpful messages
- [ ] Form validation with error messages
- [ ] URL query string sync for filters and pagination (audit logs page)
- [ ] localStorage persistence for expanded/collapsed states (tree views)
- [ ] Component tests written and passing (70%+ coverage)
- [ ] Integration tests for pages and workflows
- [ ] Role-based access control enforced (admin only)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing completed (all workflows)

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-08-admin
```

### Commits (one per story)
```bash
# Story 8.1
git commit -m "feat(admin): add categories management with tree view

- Create reusable TreeView component with expand/collapse, search, drag-drop
- Implement TreeNode component for individual nodes
- Build CategoriesPage with full CRUD operations
- Create CategoryForm modal with validation
- Add localStorage persistence for expanded states
- Integrate with adminApi

Task: 8.1.1-8.1.3"

# Story 8.2
git commit -m "feat(admin): add departments management with tree view

- Build DepartmentsPage with hierarchical display
- Create DepartmentForm with head assignment and budget linking
- Integrate department head user selector
- Add drag-drop reordering with backend sync
- Add search/filter functionality

Task: 8.2.1-8.2.2"

# Story 8.3
git commit -m "feat(admin): add approval tiers management

- Create ApprovalTiersPage with sortable list
- Implement TierForm with amount threshold validation
- Add role-based assignment for approval tiers
- Implement drag-drop reordering
- Add validation for overlapping amount ranges

Task: 8.3.1-8.3.2"

# Story 8.4
git commit -m "feat(admin): add system settings management

- Build SettingsPage with tabbed categories
- Create SettingsForm component with dynamic field types
- Implement General, Currency, Notifications, and Security settings
- Add save/reset functionality with validation
- Integrate with adminApi settings endpoints

Task: 8.4.1-8.4.2"

# Story 8.5
git commit -m "feat(admin): add audit logs with filtering and diff view

- Create AuditLogsPage with paginated table
- Implement AuditLogEntry component with action badges
- Build DiffView component showing before/after changes
- Add filtering by action, user, date range, entity
- Add search functionality for entity ID/description
- Integrate with adminApi audit logs endpoint

Task: 8.5.1-8.5.2"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-08-admin",
  "feature_name": "Administration System",
  "module_name": "admin",

  "context_files": [
    "packages/web/src/features/admin/services/admin.service.ts",
    "packages/api/src/modules/categories/dto/*.ts",
    "packages/api/src/modules/departments/dto/*.ts",
    "packages/api/src/modules/approvals/dto/*.ts",
    "packages/api/src/modules/settings/dto/*.ts",
    "packages/api/src/modules/audit/dto/*.ts",
    "packages/web/src/store/hooks.ts",
    "packages/web/src/components/ui/index.ts"
  ],

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [
      {
        "method": "GET",
        "path": "/admin/categories",
        "response": "GetCategoriesResponse"
      },
      {
        "method": "POST",
        "path": "/admin/categories",
        "body": "CreateCategoryDto",
        "response": "CategoryTreeDto"
      },
      {
        "method": "PUT",
        "path": "/admin/categories/{id}",
        "body": "UpdateCategoryDto",
        "response": "CategoryTreeDto"
      },
      {
        "method": "DELETE",
        "path": "/admin/categories/{id}",
        "response": "void"
      },
      {
        "method": "PUT",
        "path": "/admin/categories/{id}/reorder",
        "body": "ReorderCategoryRequest",
        "response": "CategoryTreeDto"
      },
      {
        "method": "GET",
        "path": "/admin/departments",
        "response": "GetDepartmentsResponse"
      },
      {
        "method": "POST",
        "path": "/admin/departments",
        "body": "CreateDepartmentDto",
        "response": "DepartmentTreeDto"
      },
      {
        "method": "PUT",
        "path": "/admin/departments/{id}",
        "body": "UpdateDepartmentDto",
        "response": "DepartmentTreeDto"
      },
      {
        "method": "DELETE",
        "path": "/admin/departments/{id}",
        "response": "void"
      },
      {
        "method": "PUT",
        "path": "/admin/departments/{id}/reorder",
        "body": "ReorderDepartmentRequest",
        "response": "DepartmentTreeDto"
      },
      {
        "method": "GET",
        "path": "/admin/approval-tiers",
        "response": "GetApprovalTiersResponse"
      },
      {
        "method": "POST",
        "path": "/admin/approval-tiers",
        "body": "CreateTierDto",
        "response": "ApprovalTierDto"
      },
      {
        "method": "PUT",
        "path": "/admin/approval-tiers/{id}",
        "body": "UpdateTierDto",
        "response": "ApprovalTierDto"
      },
      {
        "method": "DELETE",
        "path": "/admin/approval-tiers/{id}",
        "response": "void"
      },
      {
        "method": "PUT",
        "path": "/admin/approval-tiers/reorder",
        "body": "ReorderTierRequest",
        "response": "ApprovalTierDto"
      },
      {
        "method": "GET",
        "path": "/admin/settings",
        "response": "GetSettingsResponse"
      },
      {
        "method": "PATCH",
        "path": "/admin/settings",
        "body": "UpdateSettingsRequest",
        "response": "SystemSettingDto[]"
      },
      {
        "method": "GET",
        "path": "/admin/audit-logs",
        "query": {
          "page": "number",
          "pageSize": "number",
          "action": "string",
          "userId": "string",
          "dateFrom": "string (ISO)",
          "dateTo": "string (ISO)",
          "entityType": "string",
          "entityId": "string",
          "search": "string"
        },
        "response": "GetAuditLogsResponse"
      }
    ]
  },

  "pages_required": [
    "CategoriesPage - /admin/categories",
    "DepartmentsPage - /admin/departments",
    "ApprovalTiersPage - /admin/approval-tiers",
    "SettingsPage - /admin/settings",
    "AuditLogsPage - /admin/audit-logs"
  ],

  "components_required": [
    "TreeView (reusable hierarchical tree)",
    "TreeNode (individual tree node)",
    "CategoryForm (create/edit modal)",
    "DepartmentForm (create/edit modal)",
    "TierForm (create/edit modal)",
    "SettingsForm (dynamic settings form)",
    "AuditLogEntry (table row component)",
    "DiffView (before/after comparison)"
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
    "DataTable, Modal, Badge, Card, EmptyState",
    "Skeleton, Toast",
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
      "URL query params for filter state (audit logs)",
      "localStorage for UI state (tree expanded nodes)"
    ],
    "must_not": [
      "Create custom CSS files",
      "Use any types",
      "Use class components",
      "Hardcode mock data",
      "Inline event handlers (use callbacks)",
      "Create new UI primitives (use existing from Epic 1)",
      "Allow unauthorized access (enforce admin role check)"
    ],
    "role_requirements": [
      "All admin pages require ADMIN or FINANCE role",
      "Some features (delete) may require ADMIN role only"
    ]
  }
}
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Epic 1: UI Components](./epic-01-ui-components.md) | Required UI components |
| [Phase 2 WBS](./phase2-frontend-wbs.md) | Overall frontend plan |
| [Admin API CLAUDE.md](../../packages/api/src/modules/admin/CLAUDE.md) | Backend API details |
| [Frontend Engineer Agent](../.claude/agents/frontend-engineer.md) | Agent protocol |
| [Testing Patterns](../.claude/skills/testing-patterns.md) | Test writing guidance |
