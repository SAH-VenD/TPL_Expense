import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BanknotesIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Card, CardHeader, CardTitle, Skeleton, EmptyState } from '@/components/ui';
import {
  useGetBudgetSummaryQuery,
  type BudgetUtilization,
} from '@/features/budgets/services/budgets.service';

export interface BudgetOverviewProps {
  limit?: number;
  className?: string;
  departmentId?: string;
}

interface BudgetDisplayItem {
  id: string;
  name: string;
  type: string;
  allocated: number;
  spent: number;
  utilization: number;
  currency: string;
  warningThreshold: number;
}

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

const getUtilizationBgColor = (utilization: number): string => {
  if (utilization >= 90) return 'bg-red-100';
  if (utilization >= 70) return 'bg-yellow-100';
  return 'bg-gray-200';
};

const transformBudget = (budget: BudgetUtilization): BudgetDisplayItem => {
  const spent = budget.committed + budget.spent;
  const allocated = budget.allocated;
  const utilization = budget.utilizationPercentage;

  return {
    id: budget.budgetId,
    name: budget.budgetName,
    type: budget.type,
    allocated,
    spent,
    utilization,
    currency: 'PKR', // Default currency since BudgetUtilization doesn't include it
    warningThreshold: budget.warningThreshold || 80,
  };
};

const BudgetRow: React.FC<{
  budget: BudgetDisplayItem;
  onClick: () => void;
}> = ({ budget, onClick }) => {
  const isHighUtilization = budget.utilization >= 90;
  const cappedUtilization = Math.min(budget.utilization, 100);

  return (
    <div
      onClick={onClick}
      className="py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors rounded"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{budget.name}</span>
            {isHighUtilization && (
              <ExclamationTriangleIcon
                className="h-4 w-4 text-red-500"
                aria-label="High budget utilization warning"
              />
            )}
          </div>
          <span className="text-sm text-gray-600">
            {formatCurrency(budget.spent, budget.currency)} /{' '}
            {formatCurrency(budget.allocated, budget.currency)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex-1 h-2 rounded-full overflow-hidden',
              getUtilizationBgColor(budget.utilization),
            )}
          >
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                getUtilizationColor(budget.utilization),
              )}
              style={{ width: `${cappedUtilization}%` }}
            />
          </div>
          <span
            className={clsx(
              'text-sm font-medium min-w-[48px] text-right',
              budget.utilization >= 90
                ? 'text-red-600'
                : budget.utilization >= 70
                  ? 'text-yellow-600'
                  : 'text-gray-600',
            )}
          >
            {budget.utilization.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const BudgetRowSkeleton: React.FC = () => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height={16} />
        <Skeleton width={120} height={14} />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton width="100%" height={8} className="flex-1" />
        <Skeleton width={48} height={14} />
      </div>
    </div>
  </div>
);

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  limit = 3,
  className,
  departmentId,
}) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetBudgetSummaryQuery({
    activeOnly: true,
    departmentId,
  });

  // Transform and sort budgets by utilization (highest first)
  const budgets: BudgetDisplayItem[] = React.useMemo(() => {
    if (!data?.budgets) return [];
    return data.budgets
      .map(transformBudget)
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, limit);
  }, [data?.budgets, limit]);

  const handleBudgetClick = (budgetId: string) => {
    navigate(`/budgets/${budgetId}`);
  };

  return (
    <Card padding="none" className={className}>
      <div className="p-6 border-b border-gray-200">
        <CardHeader className="mb-0">
          <CardTitle>Budget Overview</CardTitle>
        </CardHeader>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-1">
            {[...Array(limit)].map((_, i) => (
              <BudgetRowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600 mb-4">Failed to load budgets</p>
            <button onClick={() => refetch()} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={<BanknotesIcon className="h-6 w-6 text-gray-400" />}
            title="No budgets configured"
            description="Set up budgets to track your spending."
            action={
              <Link to="/budgets/new" className="btn-primary text-sm">
                Create Budget
              </Link>
            }
          />
        ) : (
          <div className="space-y-1">
            {budgets.map((budget) => (
              <BudgetRow
                key={budget.id}
                budget={budget}
                onClick={() => handleBudgetClick(budget.id)}
              />
            ))}
          </div>
        )}
      </div>
      {!isLoading && !isError && budgets.length > 0 && (
        <div className="px-6 pb-4">
          <Link
            to="/budgets"
            className={clsx(
              'inline-flex items-center text-sm font-medium text-primary-600',
              'hover:text-primary-700 transition-colors',
            )}
          >
            View all budgets
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}
    </Card>
  );
};

BudgetOverview.displayName = 'BudgetOverview';
