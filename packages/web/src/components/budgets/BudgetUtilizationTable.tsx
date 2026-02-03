import React from 'react';
import clsx from 'clsx';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetUtilizationTableProps {
  budgets: BudgetUtilization[];
  isLoading: boolean;
  onRowClick: (budget: BudgetUtilization) => void;
}

const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getBudgetTypeBadgeVariant = (
  type: string
): 'primary' | 'info' | 'success' | 'warning' | 'default' => {
  const variants: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'default'> = {
    DEPARTMENT: 'primary',
    PROJECT: 'info',
    COST_CENTER: 'success',
    EMPLOYEE: 'warning',
    CATEGORY: 'default',
  };
  return variants[type] || 'default';
};

const getPeriodLabel = (period: string): string => {
  const labels: Record<string, string> = {
    ANNUAL: 'Annual',
    QUARTERLY: 'Quarterly',
    MONTHLY: 'Monthly',
    PROJECT_BASED: 'Project',
  };
  return labels[period] || period;
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    DEPARTMENT: 'Department',
    PROJECT: 'Project',
    COST_CENTER: 'Cost Center',
    EMPLOYEE: 'Employee',
    CATEGORY: 'Category',
  };
  return labels[type] || type;
};

export const BudgetUtilizationTable: React.FC<BudgetUtilizationTableProps> = ({
  budgets,
  isLoading,
  onRowClick,
}) => {
  const columns: Column<BudgetUtilization>[] = React.useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (budget) => (
          <div>
            <p className="font-medium text-gray-900">{budget.budgetName}</p>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (budget) => (
          <Badge variant={getBudgetTypeBadgeVariant(budget.type)} size="sm">
            {getTypeLabel(budget.type)}
          </Badge>
        ),
      },
      {
        key: 'period',
        header: 'Period',
        render: (budget) => (
          <span className="text-sm text-gray-600">{getPeriodLabel(budget.period)}</span>
        ),
      },
      {
        key: 'allocated',
        header: 'Allocated',
        align: 'right',
        render: (budget) => (
          <span className="font-medium text-gray-900">{formatCurrency(budget.allocated)}</span>
        ),
      },
      {
        key: 'used',
        header: 'Used',
        align: 'right',
        render: (budget) => {
          const used = budget.committed + budget.spent;
          return <span className="text-gray-600">{formatCurrency(used)}</span>;
        },
      },
      {
        key: 'remaining',
        header: 'Remaining',
        align: 'right',
        render: (budget) => (
          <span
            className={clsx(
              'font-medium',
              budget.available < 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {formatCurrency(budget.available)}
          </span>
        ),
      },
      {
        key: 'progress',
        header: 'Progress',
        render: (budget) => {
          const percent = budget.utilizationPercentage;
          const cappedPercent = Math.min(percent, 100);
          const isWarning = percent >= 70;
          const isExceeded = percent > 100;
          return (
            <div className="flex items-center gap-2 min-w-[140px]">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    isExceeded && 'bg-red-500',
                    isWarning && !isExceeded && 'bg-amber-500',
                    !isWarning && 'bg-green-500'
                  )}
                  style={{ width: `${cappedPercent}%` }}
                />
              </div>
              <span
                className={clsx(
                  'text-xs font-medium w-12 text-right',
                  isExceeded && 'text-red-600',
                  isWarning && !isExceeded && 'text-amber-600',
                  !isWarning && 'text-green-600'
                )}
              >
                {percent.toFixed(0)}%
              </span>
            </div>
          );
        },
      },
      {
        key: 'expenses',
        header: 'Expenses',
        align: 'center',
        render: (budget) => (
          <div className="text-center">
            <span className="text-sm text-gray-900">{budget.expenseCount}</span>
            {budget.pendingCount > 0 && (
              <span className="text-xs text-gray-500 ml-1">({budget.pendingCount} pending)</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (budget) => {
          if (budget.isOverBudget) {
            return (
              <Badge variant="danger" size="sm">
                Over Budget
              </Badge>
            );
          }
          if (budget.isAtWarningThreshold) {
            return (
              <Badge variant="warning" size="sm">
                Warning
              </Badge>
            );
          }
          return (
            <Badge variant="success" size="sm">
              On Track
            </Badge>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={budgets}
      keyExtractor={(budget) => budget.budgetId}
      onRowClick={onRowClick}
      loading={isLoading}
      emptyMessage="No budgets found"
    />
  );
};

BudgetUtilizationTable.displayName = 'BudgetUtilizationTable';
