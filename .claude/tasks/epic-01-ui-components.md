# Epic 1: Shared UI Component Library

**Priority:** P0 (Blocking - required by all other epics)
**Branch:** `feature/epic-01-ui-components`
**Estimated Complexity:** Medium
**Agent:** frontend-engineer

---

## Overview

Build a comprehensive, reusable UI component library that will be used across all feature pages. This epic must be completed first as all other epics depend on these components.

### Dependencies
- **Depends On:** None (this is the foundation)
- **Blocks:** All other epics

### Files to Create
```
packages/web/src/
├── components/ui/
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── DatePicker.tsx
│   ├── Textarea.tsx
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   ├── FileUpload.tsx
│   ├── DataTable.tsx
│   ├── Modal.tsx
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── EmptyState.tsx
│   ├── Skeleton.tsx
│   ├── Toast.tsx
│   ├── ConfirmDialog.tsx
│   ├── Alert.tsx
│   ├── Spinner.tsx
│   ├── Tabs.tsx
│   ├── Breadcrumb.tsx
│   ├── Pagination.tsx
│   ├── Dropdown.tsx
│   └── index.ts (barrel export)
├── hooks/
│   └── useToast.ts
```

---

## Story 1.1: Core Form Components

Build reusable form components with React Hook Form integration.

### Context to Load
```
packages/web/src/styles/globals.css (existing Tailwind component classes)
packages/web/package.json (check installed dependencies: react-hook-form, zod, @hookform/resolvers)
```

### Tasks

#### Task 1.1.1: Input Component
**File:** `packages/web/src/components/ui/Input.tsx`

**Acceptance Criteria:**
- [ ] Supports types: text, number, password, email, tel, url
- [ ] Error state with error message display
- [ ] Disabled state styling
- [ ] Label prop with proper htmlFor linking
- [ ] Helper text below input
- [ ] Uses existing `.input` and `.input-error` Tailwind classes
- [ ] Forwards ref for React Hook Form integration
- [ ] Optional left/right icon slots

**Interface:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

---

#### Task 1.1.2: Select Component
**File:** `packages/web/src/components/ui/Select.tsx`

**Acceptance Criteria:**
- [ ] Single select mode
- [ ] Multi-select mode with chips
- [ ] Searchable/filterable option
- [ ] Custom option rendering via render prop
- [ ] Clear button (when clearable prop)
- [ ] Error state with message
- [ ] Disabled state
- [ ] Keyboard navigation (arrow keys, enter, escape)
- [ ] Uses Headless UI Listbox for accessibility

**Interface:**
```typescript
interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T = string> {
  options: SelectOption<T>[];
  value?: T | T[];
  onChange: (value: T | T[]) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  renderOption?: (option: SelectOption<T>) => React.ReactNode;
}
```

---

#### Task 1.1.3: DatePicker Component
**File:** `packages/web/src/components/ui/DatePicker.tsx`

**Acceptance Criteria:**
- [ ] Single date selection mode
- [ ] Date range selection mode
- [ ] Min/max date constraints
- [ ] Keyboard navigation
- [ ] Locale support (default to Pakistan date format: DD/MM/YYYY)
- [ ] Manual text input with validation
- [ ] Calendar popup with month/year navigation
- [ ] Today button
- [ ] Clear button
- [ ] Uses date-fns for date handling

**Interface:**
```typescript
interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  dateFormat?: string; // default: 'dd/MM/yyyy'
}

interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  label?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}
```

---

#### Task 1.1.4: Textarea Component
**File:** `packages/web/src/components/ui/Textarea.tsx`

**Acceptance Criteria:**
- [ ] Character count display (optional)
- [ ] Auto-resize option (grows with content)
- [ ] Error state with message
- [ ] Max length enforcement
- [ ] Min/max rows configuration
- [ ] Disabled state
- [ ] Uses existing Tailwind classes

**Interface:**
```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}
```

---

#### Task 1.1.5: Checkbox and Radio Components
**Files:** `packages/web/src/components/ui/Checkbox.tsx`, `packages/web/src/components/ui/Radio.tsx`

**Acceptance Criteria:**
- [ ] Checkbox: Indeterminate state support
- [ ] Checkbox: Controlled and uncontrolled modes
- [ ] Radio: Group support with RadioGroup wrapper
- [ ] Both: Disabled state
- [ ] Both: Custom styling with Tailwind
- [ ] Both: Label text with click-to-toggle
- [ ] Both: Proper accessibility (keyboard, ARIA)

**Interface:**
```typescript
interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  name?: string;
}

interface RadioProps {
  value: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  name?: string;
}

interface RadioGroupProps {
  value?: string;
  onChange: (value: string) => void;
  name: string;
  children: React.ReactNode;
}
```

---

#### Task 1.1.6: FileUpload Component
**File:** `packages/web/src/components/ui/FileUpload.tsx`

**Acceptance Criteria:**
- [ ] Drag and drop support (react-dropzone)
- [ ] Click to browse
- [ ] Image preview for image files
- [ ] Progress indicator during upload
- [ ] File type validation (accept prop)
- [ ] File size limit enforcement (maxSize prop)
- [ ] Multiple files support
- [ ] Remove uploaded file button
- [ ] Error state for invalid files
- [ ] Disabled state

**Interface:**
```typescript
interface UploadedFile {
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

interface FileUploadProps {
  value?: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string; // e.g., 'image/*,.pdf'
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
  showPreview?: boolean;
}
```

---

## Story 1.2: Display Components

Build reusable display components for consistent data presentation.

### Tasks

#### Task 1.2.1: DataTable Component
**File:** `packages/web/src/components/ui/DataTable.tsx`

**Acceptance Criteria:**
- [ ] Column definition with header, accessor, render function
- [ ] Sortable columns (click header to sort)
- [ ] Built-in pagination with page size selector
- [ ] Row selection (single and multi-select modes)
- [ ] Loading skeleton state
- [ ] Empty state with customizable message
- [ ] Custom cell rendering via column config
- [ ] Responsive: horizontal scroll on mobile
- [ ] Sticky header option

**Interface:**
```typescript
interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  stickyHeader?: boolean;
  rowKey: keyof T | ((row: T) => string);
}
```

---

#### Task 1.2.2: Modal Component
**File:** `packages/web/src/components/ui/Modal.tsx`

**Acceptance Criteria:**
- [ ] Sizes: sm (400px), md (500px), lg (600px), xl (800px), full
- [ ] Close on backdrop click (optional, default true)
- [ ] Close on escape key
- [ ] Focus trap (focus stays within modal)
- [ ] Header slot with close button
- [ ] Body slot (scrollable if content overflows)
- [ ] Footer slot for actions
- [ ] Smooth open/close animation
- [ ] Uses Headless UI Dialog for accessibility

**Interface:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

---

#### Task 1.2.3: Badge Component
**File:** `packages/web/src/components/ui/Badge.tsx`

**Acceptance Criteria:**
- [ ] Variants: success, warning, danger, info, neutral
- [ ] Sizes: sm, md
- [ ] Dot indicator option (colored dot before text)
- [ ] Removable option (X button)
- [ ] Uses existing `.badge-*` Tailwind classes

**Interface:**
```typescript
interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}
```

---

#### Task 1.2.4: Card Component
**File:** `packages/web/src/components/ui/Card.tsx`

**Acceptance Criteria:**
- [ ] Header with title and optional actions slot
- [ ] Collapsible option with expand/collapse animation
- [ ] Loading state (shows skeleton overlay)
- [ ] onClick handler for clickable cards
- [ ] Hover state for clickable cards
- [ ] Uses existing `.card` Tailwind class
- [ ] Padding variants: none, sm, md, lg

**Interface:**
```typescript
interface CardProps {
  title?: string;
  headerActions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}
```

---

#### Task 1.2.5: EmptyState Component
**File:** `packages/web/src/components/ui/EmptyState.tsx`

**Acceptance Criteria:**
- [ ] Icon slot (or default icon based on variant)
- [ ] Title text
- [ ] Description text
- [ ] Action button (optional)
- [ ] Variants: no-data, no-results, error, no-permission
- [ ] Centered layout

**Interface:**
```typescript
interface EmptyStateProps {
  variant?: 'no-data' | 'no-results' | 'error' | 'no-permission';
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

#### Task 1.2.6: Skeleton Component
**File:** `packages/web/src/components/ui/Skeleton.tsx`

**Acceptance Criteria:**
- [ ] Variants: text (single line), avatar (circle), card (rectangle), table-row
- [ ] Animated shimmer effect
- [ ] Customizable width and height
- [ ] Multiple lines option for text variant
- [ ] Composable for complex skeletons

**Interface:**
```typescript
interface SkeletonProps {
  variant?: 'text' | 'avatar' | 'card' | 'table-row';
  width?: string | number;
  height?: string | number;
  lines?: number; // for text variant
  className?: string;
}
```

---

## Story 1.3: Feedback Components

Build components for user feedback and notifications.

### Tasks

#### Task 1.3.1: Toast Notifications
**Files:** `packages/web/src/components/ui/Toast.tsx`, `packages/web/src/hooks/useToast.ts`

**Acceptance Criteria:**
- [ ] Types: success, error, warning, info
- [ ] Auto-dismiss with configurable timer (default 5s)
- [ ] Manual dismiss button
- [ ] Queue multiple toasts (stack vertically)
- [ ] Position options: top-right (default), top-center, bottom-right, bottom-center
- [ ] Uses react-hot-toast internally
- [ ] Custom hook for easy usage: `const { toast } = useToast()`

**Interface:**
```typescript
interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

interface UseToast {
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id?: string) => void;
}
```

---

#### Task 1.3.2: ConfirmDialog Component
**File:** `packages/web/src/components/ui/ConfirmDialog.tsx`

**Acceptance Criteria:**
- [ ] Customizable title and message
- [ ] Danger variant (red confirm button for destructive actions)
- [ ] Loading state on confirm button
- [ ] Cancel and Confirm buttons with customizable labels
- [ ] Keyboard: Enter to confirm, Escape to cancel
- [ ] Built on top of Modal component

**Interface:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}
```

---

#### Task 1.3.3: Alert Component
**File:** `packages/web/src/components/ui/Alert.tsx`

**Acceptance Criteria:**
- [ ] Variants: info, success, warning, error
- [ ] Dismissible option with close button
- [ ] Icon based on variant (or custom icon)
- [ ] Action link/button (optional)
- [ ] Title and description text

**Interface:**
```typescript
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

#### Task 1.3.4: Spinner Component
**File:** `packages/web/src/components/ui/Spinner.tsx`

**Acceptance Criteria:**
- [ ] Sizes: sm (16px), md (24px), lg (32px), xl (48px)
- [ ] Inline mode (within text/buttons)
- [ ] Overlay mode (covers parent with backdrop)
- [ ] Custom color option
- [ ] Accessible: aria-label

**Interface:**
```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  overlay?: boolean;
  color?: string;
  label?: string; // for accessibility
}
```

---

## Story 1.4: Navigation Components

Build navigation and layout helper components.

### Tasks

#### Task 1.4.1: Tabs Component
**File:** `packages/web/src/components/ui/Tabs.tsx`

**Acceptance Criteria:**
- [ ] Horizontal tabs (default)
- [ ] Vertical tabs option
- [ ] Lazy loading content (only render active tab)
- [ ] Controlled and uncontrolled modes
- [ ] URL sync option (updates URL hash)
- [ ] Disabled tab option
- [ ] Uses Headless UI Tabs for accessibility

**Interface:**
```typescript
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  lazy?: boolean;
  syncUrl?: boolean;
}
```

---

#### Task 1.4.2: Breadcrumb Component
**File:** `packages/web/src/components/ui/Breadcrumb.tsx`

**Acceptance Criteria:**
- [ ] Items array with label and href
- [ ] Custom separator (default: /)
- [ ] Last item is plain text (current page)
- [ ] Truncate long paths with ellipsis
- [ ] Home icon for first item option
- [ ] Uses React Router Link

**Interface:**
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHomeIcon?: boolean;
  maxItems?: number; // truncate if more than this
}
```

---

#### Task 1.4.3: Pagination Component
**File:** `packages/web/src/components/ui/Pagination.tsx`

**Acceptance Criteria:**
- [ ] Page number buttons with ellipsis for large ranges
- [ ] Previous/Next buttons
- [ ] Page size selector dropdown
- [ ] "Showing X-Y of Z" text
- [ ] Jump to page input
- [ ] Responsive: simplified on mobile (prev/next only)
- [ ] Disabled state when loading

**Interface:**
```typescript
interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  disabled?: boolean;
}
```

---

#### Task 1.4.4: Dropdown Component
**File:** `packages/web/src/components/ui/Dropdown.tsx`

**Acceptance Criteria:**
- [ ] Trigger element (button or custom)
- [ ] Menu items with icons
- [ ] Dividers between sections
- [ ] Keyboard navigation (arrow keys, enter, escape)
- [ ] Position auto-adjust (flip if near edge)
- [ ] Nested submenus (optional)
- [ ] Uses Headless UI Menu for accessibility

**Interface:**
```typescript
interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  children?: DropdownItem[]; // for nested menus
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: string;
}
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file in `__tests__/` folder with:
- [ ] Renders without crashing
- [ ] All props work correctly
- [ ] Accessibility: proper ARIA attributes
- [ ] Keyboard navigation (where applicable)
- [ ] User interactions work correctly

### Test File Location
```
packages/web/src/components/ui/__tests__/
├── Input.test.tsx
├── Select.test.tsx
├── DatePicker.test.tsx
├── ... (one per component)
```

### Coverage Target
- Minimum 70% code coverage
- All user interactions tested

---

## Definition of Done

- [ ] All 20 components implemented
- [ ] All components exported from `index.ts`
- [ ] TypeScript interfaces for all props
- [ ] Tailwind styling (no inline styles)
- [ ] Responsive at all breakpoints
- [ ] Keyboard accessible
- [ ] Component tests written
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing in Storybook or test page

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-01-ui-components
```

### Commits (one per story)
```bash
# Story 1.1
git commit -m "feat(ui): add form components (Input, Select, DatePicker, etc.)

Task: 1.1.1-1.1.6"

# Story 1.2
git commit -m "feat(ui): add display components (DataTable, Modal, Card, etc.)

Task: 1.2.1-1.2.6"

# Story 1.3
git commit -m "feat(ui): add feedback components (Toast, Alert, Spinner, etc.)

Task: 1.3.1-1.3.4"

# Story 1.4
git commit -m "feat(ui): add navigation components (Tabs, Breadcrumb, Pagination, Dropdown)

Task: 1.4.1-1.4.4"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-01-ui-components",
  "feature_name": "UI Component Library",
  "module_name": "ui",

  "context_files": [
    "packages/web/src/styles/globals.css",
    "packages/web/package.json",
    "packages/web/tsconfig.json"
  ],

  "dependencies_to_use": [
    "@headlessui/react (for accessible primitives)",
    "react-hook-form (form integration)",
    "date-fns (date handling)",
    "react-dropzone (file upload)",
    "react-hot-toast (toast notifications)",
    "clsx (class name utility)"
  ],

  "constraints": {
    "must_use": ["Tailwind CSS classes", "TypeScript interfaces", "Functional components"],
    "must_not": ["Create custom CSS", "Use any types", "Use class components"]
  }
}
```
