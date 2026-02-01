import React from 'react';
import clsx from 'clsx';
import { PencilIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { Budget, BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetListViewProps {
  budgets: Budget[];
  utilizations?: Map<string, BudgetUtilization>;
  isLoading: boolean;
  isAdmin: boolean;
  onRowClick: (budget: Budget) => void;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budget: Budget) => void;
  onTransfer?: (budget: Budget) => void;
}

const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getBudgetTypeBadgeVariant = (type: string) => {
  const variants: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'default'> = {
    DEPARTMENT: 'primary',
    PROJECT: 'info',
    COST_CENTER: 'success',
    EMPLOYEE: 'warning',
    CATEGORY: 'default',
  };
  return variants[type] || 'default';
};

const getPeriodLabel = (period: string) => {
  const labels: Record<string, string> = {
    ANNUAL: 'Annual',
    QUARTERLY: 'Quarterly',
    MONTHLY: 'Monthly',
    PROJECT_BASED: 'Project',
  };
  return labels[period] || period;
};

export const BudgetListView: React.FC<BudgetListViewProps> = ({
  budgets,
  utilizations,
  isLoading,
  isAdmin,
  onRowClick,
  onEdit,
  onDelete,
  onTransfer,
}) => {
  const getUtilization = (budget: Budget) => {
    const util = utilizations?.get(budget.id);
    if (util) return util.utilizationPercent;
    return (budget.usedAmount / budget.totalAmount) * 100;
  };

  const getRemaining = (budget: Budget) => {
    const util = utilizations?.get(budget.id);
    if (util) return util.remainingAmount;
    return budget.totalAmount - budget.usedAmount;
  };

  const columns: Column<Budget>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (budget) => (
        <div>
          <p className="font-medium text-gray-900">{budget.name}</p>
          {budget.department && (
            <p className="text-xs text-gray-500">{budget.department.name}</p>
          )}
          {budget.project && (
            <p className="text-xs text-gray-500">{budget.project.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (budget) => (
        <Badge variant={getBudgetTypeBadgeVariant(budget.type)} size="sm">
          {budget.type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (budget) => (
        <span className="text-sm text-gray-600">
          {getPeriodLabel(budget.period)}
        </span>
      ),
    },
    {
      key: 'allocated',
      header: 'Allocated',
      align: 'right',
      render: (budget) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(budget.totalAmount, budget.currency)}
        </span>
      ),
    },
    {
      key: 'used',
      header: 'Used',
      align: 'right',
      render: (budget) => (
        <span className="text-gray-600">
          {formatCurrency(budget.usedAmount, budget.currency)}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (budget) => {
        const remaining = getRemaining(budget);
        return (
          <span
            className={clsx(
              'font-medium',
              remaining < 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {formatCurrency(remaining, budget.currency)}
          </span>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (budget) => {
        const percent = getUtilization(budget);
        const isWarning = percent >= 75;
        const isExceeded = percent > 100;
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full',
                  isExceeded && 'bg-red-500',
                  isWarning && !isExceeded && 'bg-amber-500',
                  !isWarning && 'bg-green-500'
                )}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <span
              className={clsx(
                'text-xs font-medium w-10 text-right',
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
  ];

  // Add actions column for admin
  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (budget) => (
        <div className="flex items-center justify-end gap-1">
          {onTransfer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(budget);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              title="Transfer budget"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(budget);
              }}
              className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-primary-50 transition-colors"
              title="Edit budget"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(budget);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
              title="Delete budget"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      data={budgets}
      keyExtractor={(budget) => budget.id}
      onRowClick={onRowClick}
      loading={isLoading}
      emptyMessage="No budgets found"
    />
  );
};

BudgetListView.displayName = 'BudgetListView';
