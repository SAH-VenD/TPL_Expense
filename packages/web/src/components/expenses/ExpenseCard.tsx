import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { FolderIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Badge, getStatusVariant } from '../ui/Badge';
import type { Expense, ExpenseStatus } from '@/features/expenses/services/expenses.service';

export interface ExpenseCardProps {
  expense: Expense;
  onClick?: () => void;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  compact?: boolean;
  view?: 'list' | 'grid';
}

const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatRelativeDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

const statusLabels: Record<ExpenseStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLARIFICATION_REQUESTED: 'Clarification',
  RESUBMITTED: 'Resubmitted',
  PAID: 'Paid',
};

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onClick,
  selected = false,
  onSelectionChange,
  compact = false,
  view = 'list',
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/expenses/${expense.id}`);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange?.(!selected);
  };

  const receiptCount = expense.receipts?.length || 0;

  if (view === 'grid') {
    return (
      <div
        onClick={handleClick}
        className={clsx(
          'bg-white rounded-lg shadow border transition-all cursor-pointer',
          selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200',
          'hover:shadow-md hover:border-gray-300'
        )}
      >
        {/* Receipt Thumbnail or Placeholder */}
        <div className="h-32 bg-gray-100 rounded-t-lg flex items-center justify-center">
          {receiptCount > 0 ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <ReceiptPercentIcon className="h-12 w-12 text-gray-400" />
              <span className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-0.5 rounded-full">
                {receiptCount}
              </span>
            </div>
          ) : (
            <FolderIcon className="h-12 w-12 text-gray-300" />
          )}
        </div>

        <div className="p-4">
          {/* Selection Checkbox */}
          {onSelectionChange && (
            <div className="mb-2">
              <input
                type="checkbox"
                checked={selected}
                onClick={handleCheckboxClick}
                onChange={() => {}}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
            </div>
          )}

          {/* Amount */}
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(expense.totalAmount || expense.amount, expense.currency)}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 truncate mt-1">
            {expense.description || 'No description'}
          </p>

          {/* Status and Tier */}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant={getStatusVariant(expense.status)} size="sm">
              {statusLabels[expense.status]}
            </Badge>
            {expense.approvalTier && (
              <span className="text-xs text-gray-500">Tier {expense.approvalTier}</span>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-gray-500 mt-2">{formatRelativeDate(expense.createdAt)}</p>
        </div>
      </div>
    );
  }

  // List view (compact or full)
  return (
    <div
      onClick={handleClick}
      className={clsx(
        'bg-white border-b border-gray-200 transition-colors cursor-pointer',
        selected ? 'bg-primary-50' : 'hover:bg-gray-50',
        compact ? 'px-4 py-3' : 'px-6 py-4'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Selection Checkbox */}
        {onSelectionChange && (
          <input
            type="checkbox"
            checked={selected}
            onClick={handleCheckboxClick}
            onChange={() => {}}
            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
          />
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-primary-600">
                {expense.expenseNumber || `EXP-${expense.id.slice(0, 6)}`}
              </span>
              <Badge variant={getStatusVariant(expense.status)} size="sm">
                {statusLabels[expense.status]}
              </Badge>
              {expense.approvalTier && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  Tier {expense.approvalTier}
                </span>
              )}
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(expense.totalAmount || expense.amount, expense.currency)}
            </span>
          </div>

          {!compact && (
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              <span className="truncate max-w-xs">
                {expense.description || 'No description'}
              </span>
              {expense.category && (
                <span className="flex items-center gap-1">
                  <FolderIcon className="h-4 w-4" />
                  {expense.category.name}
                </span>
              )}
              {expense.vendor?.name && (
                <span>Vendor: {expense.vendor.name}</span>
              )}
              {!expense.vendor?.name && expense.vendorName && (
                <span>Vendor: {expense.vendorName}</span>
              )}
            </div>
          )}

          <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
            <span title={formatDate(expense.expenseDate)}>
              {formatRelativeDate(expense.expenseDate)}
            </span>
            {receiptCount > 0 && (
              <span className="flex items-center gap-1">
                <ReceiptPercentIcon className="h-3 w-3" />
                {receiptCount} receipt{receiptCount > 1 ? 's' : ''}
              </span>
            )}
            {expense.submitter && (
              <span>
                by {expense.submitter.firstName} {expense.submitter.lastName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

ExpenseCard.displayName = 'ExpenseCard';
