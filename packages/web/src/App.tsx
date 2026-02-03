import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { MainLayout } from './components/layout/MainLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { ProtectedRoute } from './router/ProtectedRoute';
import { RoleBasedRoute } from './router/RoleBasedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Main pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ExpenseListPage } from './pages/expenses/ExpenseListPage';
import { ExpenseCreatePage } from './pages/expenses/ExpenseCreatePage';
import { ExpenseDetailPage } from './pages/expenses/ExpenseDetailPage';
import { ExpenseEditPage } from './pages/expenses/ExpenseEditPage';
import { ApprovalQueuePage } from './pages/approvals/ApprovalQueuePage';
import { VoucherListPage } from './pages/vouchers/VoucherListPage';
import { VoucherRequestPage } from './pages/vouchers/VoucherRequestPage';
import { VoucherDetailPage } from './pages/vouchers/VoucherDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { BudgetListPage } from './pages/budgets/BudgetListPage';
import { BudgetCreatePage } from './pages/budgets/BudgetCreatePage';
import { BudgetDetailPage } from './pages/budgets/BudgetDetailPage';

// Admin pages
import { UsersPage } from './pages/admin/UsersPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Notification pages
import { NotificationListPage } from './pages/notifications/NotificationListPage';

function App() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
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
        <Route path="/notifications" element={<NotificationListPage />} />

        {/* Admin routes */}
        <Route
          path="/admin/users"
          element={
            <RoleBasedRoute allowedRoles={['ADMIN']}>
              <UsersPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RoleBasedRoute allowedRoles={['ADMIN']}>
              <CategoriesPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RoleBasedRoute allowedRoles={['ADMIN']}>
              <SettingsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RoleBasedRoute allowedRoles={['ADMIN', 'FINANCE']}>
              <AuditLogsPage />
            </RoleBasedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
