# TPL Expense - Web Package

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

## Implemented Services
| Service | Status | Endpoints |
|---------|--------|-----------|
| authApi | Complete | login, register, refresh, logout |
| usersApi | Complete | CRUD + approve/deactivate |
| expensesApi | Defined | Pending backend |
| approvalsApi | Defined | Pending backend |
| vouchersApi | Defined | Pending backend |

## Key Dependencies
- `@reduxjs/toolkit` - State management
- `react-router-dom` - Routing
- `react-hook-form` - Form handling
- `@headlessui/react` - Accessible UI components
- `lucide-react` - Icons
