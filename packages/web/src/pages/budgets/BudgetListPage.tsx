import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { Card, EmptyState, Skeleton, Alert } from '@/components/ui';
import {
  useGetBudgetSummaryQuery,
  type BudgetUtilization,
} from '@/features/budgets/services/budgets.service';
import clsx from 'clsx';

const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getUtilizationColor = (utilization: number): string => {
  if (utilization >= 90) return 'bg-red-500';
  if (utilization >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getBudgetStatusBadge = (
  budget: BudgetUtilization
): { className: string; label: string } => {
  if (budget.isOverBudget) {
    return { className: 'bg-red-100 text-red-800', label: 'Over Budget' };
  }
  if (budget.isAtWarningThreshold) {
    return { className: 'bg-yellow-100 text-yellow-800', label: 'Warning' };
  }
  return { className: 'bg-green-100 text-green-800', label: 'On Track' };
};

const BudgetCard: React.FC<{ budget: BudgetUtilization }> = ({ budget }) => {
  const utilization = budget.utilizationPercentage;
  const cappedUtilization = Math.min(utilization, 100);
  const usedAmount = budget.committed + budget.spent;
  const statusBadge = getBudgetStatusBadge(budget);

  return (
    <Link to={`/budgets/${budget.budgetId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{budget.budgetName}</h3>
              <p className="text-sm text-gray-500 capitalize">
                {budget.type.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <span
              className={clsx('px-2 py-1 text-xs font-medium rounded-full', statusBadge.className)}
            >
              {statusBadge.label}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{formatCurrency(usedAmount)} used</span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(budget.allocated)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  getUtilizationColor(utilization)
                )}
                style={{ width: `${cappedUtilization}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{utilization.toFixed(1)}% utilized</span>
              <span>{budget.period.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>

          {/* Additional info */}
          <div className="flex justify-between text-xs text-gray-400 pt-2 border-t">
            <span>{budget.expenseCount} expenses</span>
            <span>{budget.pendingCount} pending</span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export const BudgetListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Use budget summary query which returns utilization data for all budgets
  const { data, isLoading, isError, refetch } = useGetBudgetSummaryQuery({
    activeOnly: false,
  });

  // Client-side pagination of the summary results
  const paginatedBudgets = data?.budgets
    ? data.budgets.slice((page - 1) * pageSize, page * pageSize)
    : [];
  const totalPages = data?.budgets ? Math.ceil(data.budgets.length / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600 mt-1">Manage and track your budgets</p>
        </div>
        <Link to="/budgets/new" className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Create Budget
        </Link>
      </div>

      {/* Summary Stats */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4">
            <p className="text-sm text-gray-500">Total Budgets</p>
            <p className="text-2xl font-semibold text-gray-900">{data.summary.totalBudgets}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-sm text-gray-500">Total Allocated</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(data.summary.totalAllocated)}
            </p>
          </Card>
          <Card className="!p-4">
            <p className="text-sm text-gray-500">Overall Utilization</p>
            <p className="text-2xl font-semibold text-gray-900">
              {data.summary.overallUtilization.toFixed(1)}%
            </p>
          </Card>
          <Card className="!p-4">
            <p className="text-sm text-gray-500">Over Threshold</p>
            <p
              className={clsx(
                'text-2xl font-semibold',
                data.summary.budgetsOverThreshold > 0 ? 'text-yellow-600' : 'text-gray-900'
              )}
            >
              {data.summary.budgetsOverThreshold}
            </p>
          </Card>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <div className="space-y-4">
                <Skeleton height={24} width="60%" />
                <Skeleton height={16} width="40%" />
                <Skeleton height={8} width="100%" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="error" title="Failed to load budgets">
          <button onClick={() => refetch()} className="text-sm font-medium underline mt-2">
            Try again
          </button>
        </Alert>
      ) : paginatedBudgets.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedBudgets.map((budget) => (
              <BudgetCard key={budget.budgetId} budget={budget} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={<BanknotesIcon className="h-12 w-12 text-gray-400" />}
            title="No budgets found"
            description="Create your first budget to start tracking spending."
            action={
              <Link to="/budgets/new" className="btn btn-primary">
                Create Budget
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
};

export default BudgetListPage;
