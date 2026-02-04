import {
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../store/hooks';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { SpendTrendChart } from '@/components/dashboard/SpendTrendChart';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { useGetDashboardSummaryQuery } from '@/features/reports/services/reports.service';
import { useGetPendingApprovalsQuery } from '@/features/approvals/services/approvals.service';
import { useDashboardContext, useRolePermissions } from '@/hooks';
import { Alert } from '@/components/ui/Alert';

export function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { departmentId, scopeLabel, isDepartmentScoped, canViewOrgWide } = useDashboardContext();
  const { canApprove, isFinance, isCEO, isAdmin } = useRolePermissions();

  // Pass departmentId for role-based filtering
  const { data: summary, isLoading, isError, refetch } = useGetDashboardSummaryQuery({
    days: 30,
    departmentId,
  });

  // Get actual pending count from user's approval queue (for APPROVER role)
  const { data: pendingApprovalsData } = useGetPendingApprovalsQuery(
    { page: 1, pageSize: 1 },
    { skip: canViewOrgWide }
  );

  const myPendingCount = pendingApprovalsData?.meta?.pagination?.total ?? 0;

  // Show finance stats for FINANCE, CEO, or ADMIN (for budget visibility)
  const showFinanceStats = isFinance || isCEO || isAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          {isDepartmentScoped ? (
            <>Showing metrics for <span className="font-medium">{scopeLabel}</span></>
          ) : (
            "Here's what's happening across the organization."
          )}
        </p>
      </div>

      {/* Error State */}
      {isError && (
        <Alert variant="error" title="Failed to load dashboard data">
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Expenses (30 days)"
          value={summary?.expenses.total.value ?? 0}
          format="currency"
          trend={summary?.expenses.total.trend}
          changePercentage={summary?.expenses.total.changePercentage}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          loading={isLoading}
          href="/expenses"
          variant="expanded"
        />
        <StatCard
          label="Approved This Month"
          value={summary?.expenses.approved.value ?? 0}
          format="currency"
          trend={summary?.expenses.approved.trend}
          changePercentage={summary?.expenses.approved.changePercentage}
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
          loading={isLoading}
          href="/expenses?status=APPROVED"
          variant="expanded"
        />
        <StatCard
          label={isDepartmentScoped ? "My Pending Approvals" : "Pending Approval"}
          value={isDepartmentScoped ? myPendingCount : (summary?.expenses.pending.value ?? 0)}
          format="number"
          subtitle={isDepartmentScoped
            ? (myPendingCount > 0 ? `${myPendingCount} awaiting your review` : undefined)
            : (summary?.approvals.pendingCount
              ? `${summary.approvals.pendingCount} awaiting review`
              : undefined)
          }
          icon={<ClockIcon className="h-6 w-6" />}
          loading={isLoading}
          href="/approvals"
          variant="expanded"
        />
        <StatCard
          label="Outstanding Vouchers"
          value={summary?.vouchers.outstandingCount ?? 0}
          format="number"
          subtitle={summary?.vouchers.overdueCount
            ? `${summary.vouchers.overdueCount} overdue`
            : undefined
          }
          icon={<BanknotesIcon className="h-6 w-6" />}
          loading={isLoading}
          href="/vouchers"
          variant="expanded"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendTrendChart showComparison={false} departmentId={departmentId} />
        <CategoryBreakdownChart variant="donut" departmentId={departmentId} />
      </div>

      {/* Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentExpenses limit={5} />
        {canApprove && <PendingApprovals limit={5} />}
      </div>

      {/* Budget Overview - Full Width */}
      <BudgetOverview limit={5} departmentId={departmentId} />

      {/* Quick Stats for Finance Users */}
      {showFinanceStats && summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-600">Budget Utilization</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {summary.budgetUtilization.overallUtilization.toFixed(1)}%
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              {summary.budgetUtilization.budgetsAtWarning > 0 && (
                <span className="text-yellow-600">
                  {summary.budgetUtilization.budgetsAtWarning} at warning
                </span>
              )}
              {summary.budgetUtilization.budgetsExceeded > 0 && (
                <span className="text-red-600">
                  {summary.budgetUtilization.budgetsExceeded} exceeded
                </span>
              )}
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-600">Outstanding Advances</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
                minimumFractionDigits: 0,
              }).format(summary.vouchers.outstandingAmount)}
            </p>
            {summary.vouchers.overdueAmount > 0 && (
              <p className="mt-2 text-sm text-red-600">
                {new Intl.NumberFormat('en-PK', {
                  style: 'currency',
                  currency: 'PKR',
                  minimumFractionDigits: 0,
                }).format(summary.vouchers.overdueAmount)} overdue
              </p>
            )}
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-600">Avg. Approval Time</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {summary.approvals.avgPendingDays.toFixed(1)} days
            </p>
            {summary.approvals.oldestPendingDays > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                Oldest pending: {summary.approvals.oldestPendingDays} days
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
