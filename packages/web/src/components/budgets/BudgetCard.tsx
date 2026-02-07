import React from 'react';
import clsx from 'clsx';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { Budget, BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetCardProps {
  budget: Budget;
  utilization?: BudgetUtilization;
  onClick: () => void;
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
    month: 'short',
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
    PROJECT_BASED: 'Project',
  };
  return labels[period] || period;
};

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, utilization, onClick }) => {
  // Use utilization data when available, otherwise compute from budget
  const utilizationPercent = utilization?.utilizationPercentage ?? 0;
  const usedAmount = utilization ? utilization.committed + utilization.spent : 0;
  const remainingAmount = utilization?.available ?? budget.totalAmount;
  const isWarning = utilization?.isAtWarningThreshold ?? utilizationPercent >= 75;
  const isExceeded = utilization?.isOverBudget ?? utilizationPercent > 100;

  const getProgressColor = () => {
    if (isExceeded) return 'bg-red-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getEntityName = () => {
    if (budget.department) return budget.department.name;
    if (budget.project) return budget.project.name;
    if (budget.category) return budget.category.name;
    return null;
  };

  const entityName = getEntityName();

  return (
    <Card hover onClick={onClick} className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{budget.name}</h3>
          {entityName && <p className="text-sm text-gray-500 truncate mt-0.5">{entityName}</p>}
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <Badge variant={getBudgetTypeBadgeVariant(budget.type)} size="sm">
            {budget.type.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Utilization Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-gray-600">Utilization</span>
          <span
            className={clsx(
              'text-sm font-medium',
              isExceeded && 'text-red-600',
              isWarning && !isExceeded && 'text-amber-600',
              !isWarning && 'text-green-600',
            )}
          >
            {utilizationPercent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', getProgressColor())}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Budget Amounts */}
      <div className="space-y-2 mb-4 flex-grow">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Used</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(usedAmount, budget.currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Allocated</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(budget.totalAmount, budget.currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
          <span className="text-gray-500">Remaining</span>
          <span
            className={clsx('font-medium', remainingAmount < 0 ? 'text-red-600' : 'text-green-600')}
          >
            {remainingAmount >= 0 ? '+' : ''}
            {formatCurrency(remainingAmount, budget.currency)}
          </span>
        </div>
      </div>

      {/* Footer with Period and Dates */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Badge variant="default" size="sm">
          {getPeriodLabel(budget.period)}
        </Badge>
        <div className="flex items-center text-xs text-gray-500">
          <CalendarDaysIcon className="h-3.5 w-3.5 mr-1" />
          {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
        </div>
      </div>
    </Card>
  );
};

BudgetCard.displayName = 'BudgetCard';
