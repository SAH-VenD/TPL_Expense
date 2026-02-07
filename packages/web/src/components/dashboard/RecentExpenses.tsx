import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ReceiptPercentIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  Badge,
  getStatusVariant,
  Skeleton,
  EmptyState,
} from '@/components/ui';
import { useGetExpensesQuery, type Expense } from '@/features/expenses/services/expenses.service';

export interface RecentExpensesProps {
  limit?: number;
  className?: string;
}

const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatRelativeDate = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PENDING_APPROVAL: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PAID: 'Paid',
    CLARIFICATION_REQUESTED: 'Clarification',
    RESUBMITTED: 'Resubmitted',
  };
  return labels[status] || status;
};

const ExpenseRow: React.FC<{ expense: Expense; onClick: () => void }> = ({ expense, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors"
  >
    <div className="min-w-0 flex-1">
      <p className="font-medium text-gray-900 truncate">
        {expense.description || expense.category?.name || 'Expense'}
      </p>
      <p className="text-sm text-gray-500">{formatRelativeDate(expense.createdAt)}</p>
    </div>
    <div className="text-right ml-4 flex-shrink-0">
      <p className="font-medium text-gray-900">
        {formatCurrency(expense.totalAmount, expense.currency)}
      </p>
      <Badge variant={getStatusVariant(expense.status)} size="sm">
        {getStatusLabel(expense.status)}
      </Badge>
    </div>
  </div>
);

const ExpenseRowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex-1">
      <Skeleton width="60%" height={16} className="mb-2" />
      <Skeleton width="40%" height={12} />
    </div>
    <div className="text-right ml-4">
      <Skeleton width={80} height={16} className="mb-2 ml-auto" />
      <Skeleton width={60} height={20} className="ml-auto" />
    </div>
  </div>
);

export const RecentExpenses: React.FC<RecentExpensesProps> = ({ limit = 5, className }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetExpensesQuery({
    pageSize: limit,
    page: 1,
  });

  const expenses = data?.data || [];

  const handleExpenseClick = (expenseId: string) => {
    navigate(`/expenses/${expenseId}`);
  };

  return (
    <Card padding="none" className={className}>
      <div className="p-6 border-b border-gray-200">
        <CardHeader className="mb-0">
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-1">
            {[...Array(limit)].map((_, i) => (
              <ExpenseRowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600 mb-4">Failed to load expenses</p>
            <button onClick={() => refetch()} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<ReceiptPercentIcon className="h-6 w-6 text-gray-400" />}
            title="No expenses yet"
            description="Create your first expense to get started!"
            action={
              <Link to="/expenses/new" className="btn-primary text-sm">
                Create Expense
              </Link>
            }
          />
        ) : (
          <div className="space-y-1">
            {expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onClick={() => handleExpenseClick(expense.id)}
              />
            ))}
          </div>
        )}
      </div>
      {!isLoading && !isError && expenses.length > 0 && (
        <div className="px-6 pb-4">
          <Link
            to="/expenses"
            className={clsx(
              'inline-flex items-center text-sm font-medium text-primary-600',
              'hover:text-primary-700 transition-colors',
            )}
          >
            View all expenses
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}
    </Card>
  );
};

RecentExpenses.displayName = 'RecentExpenses';
