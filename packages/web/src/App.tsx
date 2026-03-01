import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { MainLayout } from './components/layout/MainLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { ProtectedRoute } from './router/ProtectedRoute';
import { RoleBasedRoute } from './router/RoleBasedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Auth pages (lazy-loaded)
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);

// Main pages (lazy-loaded)
const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ExpenseListPage = lazy(() =>
  import('./pages/expenses/ExpenseListPage').then((m) => ({ default: m.ExpenseListPage })),
);
const ExpenseCreatePage = lazy(() =>
  import('./pages/expenses/ExpenseCreatePage').then((m) => ({ default: m.ExpenseCreatePage })),
);
const ExpenseDetailPage = lazy(() =>
  import('./pages/expenses/ExpenseDetailPage').then((m) => ({ default: m.ExpenseDetailPage })),
);
const ExpenseEditPage = lazy(() =>
  import('./pages/expenses/ExpenseEditPage').then((m) => ({ default: m.ExpenseEditPage })),
);
const ApprovalQueuePage = lazy(() =>
  import('./pages/approvals/ApprovalQueuePage').then((m) => ({ default: m.ApprovalQueuePage })),
);
const VoucherListPage = lazy(() => import('./pages/vouchers/VoucherListPage'));
const VoucherRequestPage = lazy(() => import('./pages/vouchers/VoucherRequestPage'));
const VoucherDetailPage = lazy(() =>
  import('./pages/vouchers/VoucherDetailPage').then((m) => ({ default: m.VoucherDetailPage })),
);
const ReportsPage = lazy(() =>
  import('./pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const BudgetListPage = lazy(() => import('./pages/budgets/BudgetListPage'));
const BudgetCreatePage = lazy(() => import('./pages/budgets/BudgetCreatePage'));
const BudgetDetailPage = lazy(() => import('./pages/budgets/BudgetDetailPage'));

// Admin pages (lazy-loaded)
const UsersPage = lazy(() =>
  import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const CategoriesPage = lazy(() =>
  import('./pages/admin/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const AuditLogsPage = lazy(() =>
  import('./pages/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })),
);

// Notification pages (lazy-loaded)
const NotificationListPage = lazy(() =>
  import('./pages/notifications/NotificationListPage').then((m) => ({
    default: m.NotificationListPage,
  })),
);

// Pre-approval pages (lazy-loaded)
const PreApprovalListPage = lazy(() =>
  import('./pages/pre-approvals/PreApprovalListPage').then((m) => ({
    default: m.PreApprovalListPage,
  })),
);
const PreApprovalRequestPage = lazy(() =>
  import('./pages/pre-approvals/PreApprovalRequestPage').then((m) => ({
    default: m.PreApprovalRequestPage,
  })),
);
const PreApprovalDetailPage = lazy(() =>
  import('./pages/pre-approvals/PreApprovalDetailPage').then((m) => ({
    default: m.PreApprovalDetailPage,
  })),
);

// Profile page (lazy-loaded)
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

const SuspenseFallback = (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

function App() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <Suspense fallback={SuspenseFallback}>
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpenseListPage />} />
          <Route path="/expenses/new" element={<ExpenseCreatePage />} />
          <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
          <Route path="/expenses/:id/edit" element={<ExpenseEditPage />} />
          <Route path="/approvals" element={<ApprovalQueuePage />} />
          <Route path="/vouchers" element={<VoucherListPage />} />
          <Route path="/vouchers/request" element={<VoucherRequestPage />} />
          <Route path="/vouchers/:id" element={<VoucherDetailPage />} />
          <Route path="/budgets" element={<BudgetListPage />} />
          <Route path="/budgets/new" element={<BudgetCreatePage />} />
          <Route path="/budgets/:id" element={<BudgetDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/pre-approvals" element={<PreApprovalListPage />} />
          <Route path="/pre-approvals/request" element={<PreApprovalRequestPage />} />
          <Route path="/pre-approvals/:id" element={<PreApprovalDetailPage />} />
          <Route path="/notifications" element={<NotificationListPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin routes */}
          <Route
            path="/admin/users"
            element={
              <RoleBasedRoute allowedRoles={['ADMIN', 'FINANCE']}>
                <UsersPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RoleBasedRoute allowedRoles={['ADMIN', 'FINANCE']}>
                <CategoriesPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RoleBasedRoute allowedRoles={['ADMIN', 'FINANCE']}>
                <SettingsPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleBasedRoute allowedRoles={['ADMIN', 'FINANCE', 'CEO']}>
                <AuditLogsPage />
              </RoleBasedRoute>
            }
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
