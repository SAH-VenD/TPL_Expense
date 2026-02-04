import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import {
  useGetPendingApprovalsQuery,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useBulkApproveMutation,
  useRequestClarificationMutation,
} from '@/features/approvals/services/approvals.service';
import { Skeleton, ConfirmDialog, showToast } from '@/components/ui';
import { useRolePermissions } from '@/hooks';
import type { Expense } from '@/features/expenses/services/expenses.service';

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

export function ApprovalQueuePage() {
  const navigate = useNavigate();
  const { canApprove } = useRolePermissions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [actionExpenseId, setActionExpenseId] = useState<string | null>(null);
  const [isBulkAction, setIsBulkAction] = useState(false);

  // RTK Query hooks
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetPendingApprovalsQuery({ page, pageSize });

  const [approveExpense, { isLoading: isApproving }] = useApproveExpenseMutation();
  const [rejectExpense, { isLoading: isRejecting }] = useRejectExpenseMutation();
  const [bulkApprove, { isLoading: isBulkApproving }] = useBulkApproveMutation();
  const [requestClarification, { isLoading: isClarifying }] = useRequestClarificationMutation();

  const pendingApprovals = data?.data || [];
  const totalItems = data?.meta?.pagination?.total || 0;
  const totalPages = data?.meta?.pagination?.totalPages || 1;

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === pendingApprovals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingApprovals.map((expense) => expense.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Single approve handler
  const handleApprove = async (expenseId: string) => {
    try {
      await approveExpense({ expenseId }).unwrap();
      showToast.success('Expense approved successfully');
      setSelectedIds(selectedIds.filter((id) => id !== expenseId));
    } catch (error: any) {
      showToast.error(error?.data?.message || 'Failed to approve expense');
    }
  };

  // Bulk approve handler
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      const result = await bulkApprove({ expenseIds: selectedIds }).unwrap();
      showToast.success(`${result.approved} expense(s) approved successfully`);
      setSelectedIds([]);
    } catch (error: any) {
      showToast.error(error?.data?.message || 'Failed to approve expenses');
    }
  };

  // Single reject handler - opens modal
  const handleRejectClick = (expenseId: string) => {
    setActionExpenseId(expenseId);
    setIsBulkAction(false);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Bulk reject handler - opens modal
  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    setIsBulkAction(true);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Confirm rejection
  const confirmReject = async () => {
    if (!rejectReason.trim()) return;

    try {
      if (isBulkAction) {
        // Reject each selected expense sequentially
        let successCount = 0;
        for (const expenseId of selectedIds) {
          try {
            await rejectExpense({ expenseId, reason: rejectReason }).unwrap();
            successCount++;
          } catch {
            // Continue with next expense
          }
        }
        showToast.success(`${successCount} expense(s) rejected`);
        setSelectedIds([]);
      } else if (actionExpenseId) {
        await rejectExpense({ expenseId: actionExpenseId, reason: rejectReason }).unwrap();
        showToast.success('Expense rejected');
        setSelectedIds(selectedIds.filter((id) => id !== actionExpenseId));
      }
    } catch (error: any) {
      showToast.error(error?.data?.message || 'Failed to reject expense');
    } finally {
      setShowRejectModal(false);
      setRejectReason('');
      setActionExpenseId(null);
      setIsBulkAction(false);
    }
  };

  // Clarification handler - opens modal
  const handleClarifyClick = (expenseId: string) => {
    setActionExpenseId(expenseId);
    setClarifyQuestion('');
    setShowClarifyModal(true);
  };

  // Confirm clarification request
  const confirmClarify = async () => {
    if (!clarifyQuestion.trim() || !actionExpenseId) return;

    try {
      await requestClarification({
        expenseId: actionExpenseId,
        question: clarifyQuestion,
      }).unwrap();
      showToast.success('Clarification requested');
      setSelectedIds(selectedIds.filter((id) => id !== actionExpenseId));
    } catch (error: any) {
      showToast.error(error?.data?.message || 'Failed to request clarification');
    } finally {
      setShowClarifyModal(false);
      setClarifyQuestion('');
      setActionExpenseId(null);
    }
  };

  // Navigation
  const handleRowClick = (expenseId: string) => {
    navigate(`/expenses/${expenseId}`);
  };

  const isActionInProgress = isApproving || isRejecting || isBulkApproving || isClarifying;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton width={200} height={32} />
          <Skeleton width={150} height={20} />
        </div>
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3"><Skeleton width={20} height={20} /></th>
                <th className="px-6 py-3"><Skeleton width={80} height={16} /></th>
                <th className="px-6 py-3"><Skeleton width={80} height={16} /></th>
                <th className="px-6 py-3"><Skeleton width={80} height={16} /></th>
                <th className="px-6 py-3"><Skeleton width={80} height={16} /></th>
                <th className="px-6 py-3"><Skeleton width={80} height={16} /></th>
                <th className="px-6 py-3"><Skeleton width={80} height={16} /></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton width={20} height={20} /></td>
                  <td className="px-6 py-4"><Skeleton width={150} height={40} /></td>
                  <td className="px-6 py-4"><Skeleton width={100} height={30} /></td>
                  <td className="px-6 py-4"><Skeleton width={80} height={20} /></td>
                  <td className="px-6 py-4"><Skeleton width={80} height={20} /></td>
                  <td className="px-6 py-4"><Skeleton width={50} height={24} /></td>
                  <td className="px-6 py-4"><Skeleton width={180} height={32} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        </div>
        <div className="card p-8 text-center">
          <p className="text-red-600 mb-4">Failed to load pending approvals</p>
          <button
            onClick={() => refetch()}
            className="btn-primary inline-flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={clsx('h-5 w-5', isFetching && 'animate-spin')} />
          </button>
          <span className="text-sm text-gray-500">
            {totalItems} expense(s) {canApprove ? 'awaiting your approval' : 'pending approval'}
          </span>
        </div>
      </div>

      {/* Bulk Actions - Only shown for users who can approve */}
      {canApprove && selectedIds.length > 0 && (
        <div className="bg-primary-50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-primary-800 font-medium">
            {selectedIds.length} expense(s) selected
          </span>
          <div className="space-x-3">
            <button
              onClick={handleBulkApprove}
              disabled={isActionInProgress}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isBulkApproving ? 'Approving...' : 'Approve Selected'}
            </button>
            <button
              onClick={handleBulkReject}
              disabled={isActionInProgress}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Approval Queue */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {canApprove && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={pendingApprovals.length > 0 && selectedIds.length === pendingApprovals.length}
                    onChange={handleSelectAll}
                    disabled={pendingApprovals.length === 0}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expense
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              {canApprove && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingApprovals.map((expense: Expense) => {
              const submitterName = expense.submitter
                ? `${expense.submitter.firstName} ${expense.submitter.lastName}`
                : 'Unknown';

              return (
                <tr
                  key={expense.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(expense.id)}
                >
                  {canApprove && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(expense.id)}
                        onChange={() => handleSelect(expense.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-primary-600">
                        {expense.expenseNumber || `EXP-${expense.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {expense.description || 'No description'}
                      </p>
                      {expense.expenseDate && (
                        <p className="text-xs text-gray-400">
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{submitterName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.category?.name || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(expense.totalAmount, expense.currency)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.submittedAt
                      ? formatRelativeDate(expense.submittedAt)
                      : formatRelativeDate(expense.createdAt)}
                  </td>
                  {canApprove && (
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleApprove(expense.id)}
                          disabled={isActionInProgress}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 inline-flex items-center"
                          title="Approve"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(expense.id)}
                          disabled={isActionInProgress}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center"
                          title="Reject"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleClarifyClick(expense.id)}
                          disabled={isActionInProgress}
                          className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 inline-flex items-center"
                          title="Request Clarification"
                        >
                          <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                          Clarify
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {pendingApprovals.length === 0 && (
          <div className="text-center py-12">
            <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">All caught up!</p>
            <p className="text-gray-400 text-sm">No pending approvals at the moment.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <ConfirmDialog
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setActionExpenseId(null);
          setIsBulkAction(false);
        }}
        onConfirm={confirmReject}
        title={isBulkAction ? `Reject ${selectedIds.length} Expense(s)` : 'Reject Expense'}
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
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Please provide a reason for rejection..."
            required
          />
        </div>
      </ConfirmDialog>

      {/* Clarification Modal */}
      <ConfirmDialog
        isOpen={showClarifyModal}
        onClose={() => {
          setShowClarifyModal(false);
          setClarifyQuestion('');
          setActionExpenseId(null);
        }}
        onConfirm={confirmClarify}
        title="Request Clarification"
        message="What information do you need from the submitter?"
        confirmText={isClarifying ? 'Sending...' : 'Send Request'}
        variant="primary"
        isLoading={isClarifying}
      >
        <div className="mt-4">
          <label
            htmlFor="clarify-question"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            id="clarify-question"
            value={clarifyQuestion}
            onChange={(e) => setClarifyQuestion(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Enter your question for the expense submitter..."
            required
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
