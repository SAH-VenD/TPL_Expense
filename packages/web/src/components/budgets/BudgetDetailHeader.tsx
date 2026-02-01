import React from 'react';
import clsx from 'clsx';
import {
  PencilIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import type { Budget, BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetDetailHeaderProps {
  budget: Budget;
  utilization?: BudgetUtilization;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTransfer?: () => void;
}

const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PK', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
    PROJECT_BASED: 'Project Based',
  };
  return labels[period] || period;
};

const getEnforcementBadgeVariant = (enforcement: string) => {
  const variants: Record<string, 'danger' | 'warning' | 'info'> = {
    HARD_BLOCK: 'danger',
    SOFT_WARNING: 'warning',
    AUTO_ESCALATE: 'info',
  };
  return variants[enforcement] || 'default';
};

const getEnforcementLabel = (enforcement: string) => {
  const labels: Record<string, string> = {
    HARD_BLOCK: 'Hard Block',
    SOFT_WARNING: 'Soft Warning',
    AUTO_ESCALATE: 'Auto Escalate',
  };
  return labels[enforcement] || enforcement;
};

export const BudgetDetailHeader: React.FC<BudgetDetailHeaderProps> = ({
  budget,
  utilization,
  isAdmin,
  onEdit,
  onDelete,
  onTransfer,
}) => {
  const utilizationPercent = utilization?.utilizationPercent ??
    (budget.usedAmount / budget.totalAmount) * 100;
  const remainingAmount = utilization?.remainingAmount ??
    (budget.totalAmount - budget.usedAmount);
  const isWarning = utilization?.isWarning ?? utilizationPercent >= budget.warningThreshold;
  const isExceeded = utilization?.isExceeded ?? utilizationPercent > 100;

  const getProgressColor = () => {
    if (isExceeded) return 'bg-red-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getEntityInfo = () => {
    if (budget.department) return { type: 'Department', name: budget.department.name };
    if (budget.project) return { type: 'Project', name: budget.project.name };
    if (budget.category) return { type: 'Category', name: budget.category.name };
    return null;
  };

  const entityInfo = getEntityInfo();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{budget.name}</h1>
            {(isWarning || isExceeded) && (
              <span
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  isExceeded
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                )}
              >
                {isExceeded ? (
                  <ExclamationCircleIcon className="h-4 w-4" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4" />
                )}
                {isExceeded ? 'Budget Exceeded' : 'Warning Threshold'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={getBudgetTypeBadgeVariant(budget.type)}>
              {budget.type.replace('_', ' ')}
            </Badge>
            <Badge variant="default">{getPeriodLabel(budget.period)}</Badge>
            <Badge variant={getEnforcementBadgeVariant(budget.enforcement)}>
              {getEnforcementLabel(budget.enforcement)}
            </Badge>
            <Badge variant={budget.isActive ? 'success' : 'default'} dot>
              {budget.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {entityInfo && (
            <p className="text-sm text-gray-500">
              <span className="font-medium">{entityInfo.type}:</span> {entityInfo.name}
            </p>
          )}

          <p className="text-sm text-gray-500 mt-1">
            {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
          </p>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            {onTransfer && (
              <button
                onClick={onTransfer}
                className="btn btn-secondary flex items-center gap-2"
              >
                <ArrowsRightLeftIcon className="h-4 w-4" />
                Transfer
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn btn-secondary flex items-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="btn btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Allocated Budget</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(budget.totalAmount, budget.currency)}
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Used Amount</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(budget.usedAmount, budget.currency)}
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Remaining</p>
          <p
            className={clsx(
              'text-2xl font-bold',
              remainingAmount < 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {remainingAmount >= 0 ? '+' : ''}
            {formatCurrency(remainingAmount, budget.currency)}
          </p>
        </div>
      </div>

      {/* Utilization Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Budget Utilization</span>
          <span
            className={clsx(
              'text-sm font-semibold',
              isExceeded && 'text-red-600',
              isWarning && !isExceeded && 'text-amber-600',
              !isWarning && 'text-green-600'
            )}
          >
            {utilizationPercent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden relative">
          <div
            className={clsx('h-full rounded-full transition-all', getProgressColor())}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
          {/* Warning threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600"
            style={{ left: `${budget.warningThreshold}%` }}
            title={`Warning threshold: ${budget.warningThreshold}%`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">0%</span>
          <span className="text-xs text-amber-600">
            Warning: {budget.warningThreshold}%
          </span>
          <span className="text-xs text-gray-500">100%</span>
        </div>
      </div>
    </div>
  );
};

BudgetDetailHeader.displayName = 'BudgetDetailHeader';
