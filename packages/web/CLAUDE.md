# TPL Expense - Web Package

**Status:** COMPLETE (29 pages, 9 services, UI/UX hardened)

## Quick Reference
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit + RTK Query
- **Icons**: `@heroicons/react/24/outline` (do NOT use inline SVGs or emoji icons)
- **Port**: 5173
- **Lint**: ESLint with max 10 warnings (`packages/web/.eslintrc.cjs`)

## Project Structure
```
packages/web/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── layout/     # MainLayout, AuthLayout
│   │   ├── ui/         # Buttons, inputs, modals, Pagination, DataTable, etc.
│   │   ├── expenses/   # CameraCapture, OcrPreview
│   │   └── notifications/ # NotificationBell
│   ├── constants/      # Role constants (roles.ts)
│   ├── utils/          # Shared utilities
│   │   ├── error.ts    # getApiErrorMessage() for typed error handling
│   │   └── format.ts   # formatCurrency() — single source of truth
│   ├── features/       # Feature-specific RTK Query services
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── expenses/
│   │   ├── approvals/
│   │   ├── vouchers/
│   │   ├── budgets/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── pre-approvals/
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks (useRolePermissions, etc.)
│   ├── store/          # Redux store config
│   └── types/          # Shared TypeScript types
└── index.html
```

## Commands
```bash
npm run dev:web          # Start dev server
npm run build:web        # Production build
npm run test:web         # Run tests
npm run lint -w @tpl-expense/web  # Lint (max 10 warnings)
```

## RTK Query Services
All API services are in `src/features/{feature}/services/`. Pattern:
```typescript
export const featureApi = createApi({
  reducerPath: 'featureApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Entity'],
  endpoints: (builder) => ({
    getEntities: builder.query({ ... }),
    createEntity: builder.mutation({ ... }),
  }),
});
```

## Component Patterns

### Page Component
```typescript
export function FeaturePage() {
  const { data, isLoading } = useGetFeatureQuery();
  if (isLoading) return <Spinner size="lg" />;
  return <FeatureList data={data} />;
}
```

### Protected Route
```typescript
<RoleBasedRoute allowedRoles={['ADMIN', 'FINANCE']}>
  <AdminPage />
</RoleBasedRoute>
```

## Implementation Status

### Implemented Pages (29 total)
| Area | Pages | Status |
|------|-------|--------|
| Auth | LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage | Complete |
| Dashboard | DashboardPage | Complete (role-based widget visibility) |
| Expenses | ExpenseListPage, ExpenseCreatePage, ExpenseEditPage, ExpenseDetailPage | Complete (+ OCR camera capture) |
| Approvals | ApprovalQueuePage | Complete (+ emergency approvals) |
| Budgets | BudgetListPage, BudgetCreatePage, BudgetDetailPage | Complete (+ tests) |
| Vouchers | VoucherListPage, VoucherDetailPage, VoucherRequestPage | Complete |
| Reports | ReportsPage | Complete (6 report types + XLSX/CSV/PDF export) |
| Admin | UsersPage, CategoriesPage, SettingsPage, AuditLogsPage | Complete (connected to APIs) |
| Pre-Approvals | PreApprovalListPage, PreApprovalRequestPage, PreApprovalDetailPage | Complete |
| Notifications | NotificationListPage | Complete |
| Profile | ProfilePage | Complete (+ password change) |

### Implemented RTK Query Services (9)
| Service | Path | Status |
|---------|------|--------|
| authApi | `features/auth/services/auth.service.ts` | Complete (+ changePassword) |
| adminApi | `features/admin/services/admin.service.ts` | Complete |
| expensesApi | `features/expenses/services/expenses.service.ts` | Complete (+ OCR endpoints) |
| approvalsApi | `features/approvals/services/approvals.service.ts` | Complete (+ emergency fields) |
| vouchersApi | `features/vouchers/services/vouchers.service.ts` | Complete |
| budgetsApi | `features/budgets/services/budgets.service.ts` | Complete |
| reportsApi | `features/reports/services/reports.service.ts` | Complete |
| notificationsApi | `features/notifications/services/notifications.service.ts` | Complete |
| preApprovalsApi | `features/pre-approvals/services/pre-approvals.service.ts` | Complete |

### RBAC & Role Constants
Role groups defined in `src/constants/roles.ts`:
- `ALL_ROLES` - All 6 roles (pages accessible to everyone)
- `APPROVING_ROLES` - APPROVER, SUPER_APPROVER, FINANCE, CEO
- `APPROVAL_READ_ROLES` - Approving roles + ADMIN (read-only)
- `EMERGENCY_APPROVAL_ROLES` - CEO, SUPER_APPROVER, FINANCE
- `BUDGET_MANAGEMENT_ROLES` - FINANCE, CEO, ADMIN
- `ORG_WIDE_VISIBILITY_ROLES` - CEO, SUPER_APPROVER, FINANCE, ADMIN
- `REPORTING_ROLES` - SUPER_APPROVER, FINANCE, CEO, ADMIN
- `ADMIN_NAV_ROLES` - ADMIN, FINANCE, CEO

### Key Hooks
- `useRolePermissions()` - Returns `canApprove`, `canEmergencyApprove`, `isCEO`, etc.
- `useDashboardContext()` - Controls widget visibility based on role

## Conventions

### Icons
Always use `@heroicons/react/24/outline` — never use inline SVGs or emoji characters as icons.

### Currency Formatting
Use the shared utility — never define local `formatCurrency` functions:
```typescript
import { formatCurrency } from '@/utils/format';
formatCurrency(1500);        // "Rs 1,500"
formatCurrency(1500, 'USD'); // "$1,500"
```

### Accessibility
- Clickable table rows must have `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers
- All checkboxes must have descriptive `aria-label` attributes
- Mobile toggle buttons need `aria-label` and `aria-expanded`
- Tables must have responsive mobile card fallbacks (use `hidden md:table` / `md:hidden` pattern)

### Blob URL Management
When using `URL.createObjectURL()`, always track URLs in a `useRef` and revoke on cleanup:
```typescript
const blobUrlsRef = useRef<string[]>([]);
useEffect(() => () => { blobUrlsRef.current.forEach(URL.revokeObjectURL); }, []);
```

### Pagination
Use the shared `<Pagination>` component from `@/components/ui` — never create custom pagination.

## Key Dependencies
- `@reduxjs/toolkit` - State management
- `react-router-dom` - Routing
- `react-hook-form` - Form handling
- `@heroicons/react` - Icons (outline style)
- `date-fns` - Date formatting
- `clsx` - Conditional class names
