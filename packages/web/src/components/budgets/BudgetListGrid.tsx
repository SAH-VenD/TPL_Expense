import React from 'react';
import clsx from 'clsx';
import { BudgetCard } from './BudgetCard';
import type { Budget, BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetListGridProps {
  budgets: Budget[];
  utilizations?: Map<string, BudgetUtilization>;
  onBudgetClick: (budget: Budget) => void;
  className?: string;
}

export const BudgetListGrid: React.FC<BudgetListGridProps> = ({
  budgets,
  utilizations,
  onBudgetClick,
  className,
}) => {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {budgets.map((budget) => (
        <BudgetCard
          key={budget.id}
          budget={budget}
          utilization={utilizations?.get(budget.id)}
          onClick={() => onBudgetClick(budget)}
        />
      ))}
    </div>
  );
};

BudgetListGrid.displayName = 'BudgetListGrid';
