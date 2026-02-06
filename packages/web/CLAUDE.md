# TPL Expense - Web Package

**Phase 2 Status:** ~80% Complete (25 pages, 8 services implemented)

## Quick Reference
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit + RTK Query
- **Port**: 5173

## Project Structure
```
packages/web/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── layouts/    # MainLayout, AuthLayout
│   │   └── ui/         # Buttons, inputs, etc.
│   ├── pages/          # Route pages
│   ├── services/       # RTK Query API slices
│   ├── store/          # Redux store config
│   ├── hooks/          # Custom React hooks
│   └── utils/          # Helper functions
└── index.html
```

## Commands
```bash
npm run dev:web          # Start dev server
npm run build:web        # Production build
npm run test:web         # Run tests
```

## RTK Query Services
All API services are in `src/services/`. Pattern:
```typescript
// src/services/expensesApi.ts
export const expensesApi = createApi({
  reducerPath: 'expensesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Expense'],
  endpoints: (builder) => ({
    getExpenses: builder.query({ ... }),
    createExpense: builder.mutation({ ... }),
  }),
});
```

## Component Patterns

### Page Component
```typescript
// src/pages/{Feature}/index.tsx
export default function FeaturePage() {
  const { data, isLoading } = useGetFeatureQuery();
  if (isLoading) return <LoadingSpinner />;
  return <FeatureList data={data} />;
}
```

### Protected Route
```typescript
<ProtectedRoute requiredRoles={['ADMIN', 'FINANCE']}>
  <AdminPage />
</ProtectedRoute>
```

## Implementation Status

### Implemented Pages (25 total)
| Area | Pages | Status |
|------|-------|--------|
| Auth | LoginPage, RegisterPage, ForgotPasswordPage | Complete |
| Dashboard | DashboardPage | Complete (role-based visibility in progress) |
| Expenses | ExpenseListPage, ExpenseCreatePage, ExpenseEditPage, ExpenseDetailPage | Complete |
| Approvals | ApprovalQueuePage | Complete |
| Budgets | BudgetListPage, BudgetCreatePage, BudgetDetailPage | Complete (+ tests) |
| Vouchers | VoucherListPage, VoucherDetailPage, VoucherRequestPage | Complete |
| Reports | ReportsPage | Complete |
| Admin | UsersPage, CategoriesPage, SettingsPage, AuditLogsPage | Complete |
| Notifications | NotificationListPage | Complete |
| Profile | ProfilePage | Complete |

### Implemented RTK Query Services (8)
| Service | Path | Status |
|---------|------|--------|
| authApi | `features/auth/services/auth.service.ts` | Complete |
| adminApi | `features/admin/services/admin.service.ts` | Complete |
| expensesApi | `features/expenses/services/expenses.service.ts` | Complete |
| approvalsApi | `features/approvals/services/approvals.service.ts` | Complete |
| vouchersApi | `features/vouchers/services/vouchers.service.ts` | Complete |
| budgetsApi | `features/budgets/services/budgets.service.ts` | Complete |
| reportsApi | `features/reports/services/reports.service.ts` | Complete |
| notificationsApi | `features/notifications/services/notifications.service.ts` | Complete |

### Remaining Work
- **QA Testing**: Role-based widget visibility (in progress)
- **Epic 9**: OCR & Receipt Processing (not started)
- **Epic 10**: Pre-Approval Workflow (not started)
- **RBAC Overhaul**: Enhanced role access control

## Key Dependencies
- `@reduxjs/toolkit` - State management
- `react-router-dom` - Routing
- `react-hook-form` - Form handling
- `@headlessui/react` - Accessible UI components
- `lucide-react` - Icons
