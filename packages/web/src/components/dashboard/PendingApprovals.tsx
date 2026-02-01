import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentCheckIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  Skeleton,
  EmptyState,
  ConfirmDialog,
  showToast,
} from '@/components/ui';
import {
  useGetPendingApprovalsQuery,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
} from '@/features/approvals/services/approvals.service';
import type { Expense } from '@/features/expenses/services/expenses.service';

export interface PendingApprovalsProps {
  limit?: number;
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string, reason: string) => void;
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

const ApprovalRow: React.FC<{
  expense: Expense;
  onRowClick: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}> = ({ expense, onRowClick, onApprove, onReject, isApproving, isRejecting }) => {
  const submitterName = expense.submitter
    ? `${expense.submitter.firstName} ${expense.submitter.lastName}`
    : 'Unknown';

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div
        onClick={onRowClick}
        className="cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 transition-colors rounded"
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">
              {expense.description || expense.category?.name || 'Expense'}
            </p>
            <p className="text-sm text-gray-500">
              By: {submitterName} - {formatRelativeDate(expense.createdAt)}
            </p>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <p className="font-medium text-gray-900">
              {formatCurrency(expense.totalAmount, expense.currency)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          disabled={isApproving || isRejecting}
          className={clsx(
            'flex-1 inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            'bg-green-600 text-white hover:bg-green-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          {isApproving ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          disabled={isApproving || isRejecting}
          className={clsx(
            'flex-1 inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            'bg-red-600 text-white hover:bg-red-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          {isRejecting ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
};

const ApprovalRowSkeleton: React.FC = () => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-center justify-between mb-2">
      <div className="flex-1">
        <Skeleton width="60%" height={16} className="mb-2" />
        <Skeleton width="40%" height={12} />
      </div>
      <div className="text-right ml-4">
        <Skeleton width={80} height={16} />
      </div>
    </div>
    <div className="flex gap-2 mt-2">
      <Skeleton width="100%" height={32} className="flex-1" />
      <Skeleton width="100%" height={32} className="flex-1" />
    </div>
  </div>
);

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({
  limit = 5,
  onApprove: onApproveCallback,
  onReject: onRejectCallback,
  className,
}) => {
  const navigate = useNavigate();
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError, refetch } = useGetPendingApprovalsQuery({
    pageSize: limit,
    page: 1,
  });

  const [approveExpense, { isLoading: isApproving }] = useApproveExpenseMutation();
  const [rejectExpense, { isLoading: isRejecting }] = useRejectExpenseMutation();

  const approvals = data?.data || [];

  const handleApprove = async (expenseId: string) => {
    try {
      await approveExpense({ expenseId }).unwrap();
      showToast.success('Expense approved successfully');
      onApproveCallback?.(expenseId);
    } catch (error) {
      showToast.error('Failed to approve expense');
    }
  };

  const handleRejectClick = (expenseId: string) => {
    setRejectingExpenseId(expenseId);
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectingExpenseId || !rejectReason.trim()) return;

    try {
      await rejectExpense({
        expenseId: rejectingExpenseId,
        reason: rejectReason,
      }).unwrap();
      showToast.success('Expense rejected');
      onRejectCallback?.(rejectingExpenseId, rejectReason);
      setRejectingExpenseId(null);
      setRejectReason('');
    } catch (error) {
      showToast.error('Failed to reject expense');
    }
  };

  const handleRowClick = (expenseId: string) => {
    navigate(`/expenses/${expenseId}`);
  };

  return (
    <>
      <Card padding="none" className={className}>
        <div className="p-6 border-b border-gray-200">
          <CardHeader className="mb-0">
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(limit)].map((_, i) => (
                <ApprovalRowSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 mb-4">Failed to load approvals</p>
              <button onClick={() => refetch()} className="btn-primary text-sm">
                Retry
              </button>
            </div>
          ) : approvals.length === 0 ? (
            <EmptyState
              icon={
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-400" />
              }
              title="All caught up!"
              description="No pending approvals at the moment."
            />
          ) : (
            <div className="space-y-1">
              {approvals.map((expense) => (
                <ApprovalRow
                  key={expense.id}
                  expense={expense}
                  onRowClick={() => handleRowClick(expense.id)}
                  onApprove={() => handleApprove(expense.id)}
                  onReject={() => handleRejectClick(expense.id)}
                  isApproving={isApproving}
                  isRejecting={isRejecting}
                />
              ))}
            </div>
          )}
        </div>
        {!isLoading && !isError && approvals.length > 0 && (
          <div className="px-6 pb-4">
            <Link
              to="/approvals"
              className={clsx(
                'inline-flex items-center text-sm font-medium text-primary-600',
                'hover:text-primary-700 transition-colors'
              )}
            >
              View all approvals
              <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!rejectingExpenseId}
        onClose={() => setRejectingExpenseId(null)}
        onConfirm={handleRejectConfirm}
        title="Reject Expense"
        message="Please provide a reason for rejecting this expense."
        confirmText={isRejecting ? 'Rejecting...' : 'Reject'}
        variant="danger"
        isLoading={isRejecting}
      >
        <div className="mt-4">
          <label
            htmlFor="reject-reason"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Rejection Reason
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Enter the reason for rejection..."
            required
          />
        </div>
      </ConfirmDialog>
    </>
  );
};

PendingApprovals.displayName = 'PendingApprovals';
