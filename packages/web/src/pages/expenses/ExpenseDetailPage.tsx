import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  useGetExpenseQuery,
  useSubmitExpenseMutation,
  useWithdrawExpenseMutation,
  useDeleteExpenseMutation,
  useResubmitExpenseMutation,
  useGetExpenseApprovalsQuery,
} from '@/features/expenses/services/expenses.service';
import type { Receipt } from '@/features/expenses/services/expenses.service';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { showToast, PageHeader } from '@/components/ui';
import { ReceiptViewerModal } from '@/components/expenses/ReceiptViewerModal';

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch expense data
  const {
    data: expense,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetExpenseQuery(id!, { skip: !id });

  // Fetch approval history
  const { data: approvalHistory = [] } = useGetExpenseApprovalsQuery(id!, {
    skip: !id,
  });

  // Mutations
  const [submitExpense, { isLoading: isSubmitting }] = useSubmitExpenseMutation();
  const [withdrawExpense, { isLoading: isWithdrawing }] = useWithdrawExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();
  const [resubmitExpense, { isLoading: isResubmitting }] = useResubmitExpenseMutation();

  const isActionLoading = isSubmitting || isWithdrawing || isDeleting || isResubmitting;

  // Receipt viewer modal state
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleCloseReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setSelectedReceipt(null);
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await submitExpense(id).unwrap();
      showToast.success('Expense submitted for approval');
      refetch();
    } catch {
      showToast.error('Failed to submit expense');
    }
  };

  const handleWithdraw = async () => {
    if (!id) return;
    try {
      await withdrawExpense(id).unwrap();
      showToast.success('Expense withdrawn');
      refetch();
    } catch {
      showToast.error('Failed to withdraw expense');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id).unwrap();
      showToast.success('Expense deleted');
      navigate('/expenses');
    } catch {
      showToast.error('Failed to delete expense');
    }
  };

  const handleResubmit = async () => {
    if (!id) return;
    try {
      await resubmitExpense(id).unwrap();
      showToast.success('Expense resubmitted for approval');
      refetch();
    } catch {
      showToast.error('Failed to resubmit expense');
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SUBMITTED: 'bg-yellow-100 text-yellow-800',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CLARIFICATION_REQUESTED: 'bg-orange-100 text-orange-800',
    RESUBMITTED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-blue-100 text-blue-800',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CLARIFICATION_REQUESTED: 'Clarification Requested',
    RESUBMITTED: 'Resubmitted',
    PAID: 'Paid',
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading..."
          breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'Details' }]}
        />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error"
          breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'Details' }]}
        />
        <Alert variant="error" title="Failed to load expense">
          {(error as { message?: string })?.message ||
            'An error occurred while loading the expense.'}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  // Not found
  if (!expense) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Not Found"
          breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'Details' }]}
        />
        <Alert variant="warning" title="Expense not found">
          The expense you are looking for does not exist or you do not have permission to view it.
        </Alert>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={expense.expenseNumber}
        subtitle={expense.description}
        breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: expense.expenseNumber }]}
        actions={
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              statusColors[expense.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {statusLabels[expense.status] || expense.status}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.type.replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Category</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.category?.name || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Vendor</dt>
                <dd className="text-sm font-medium text-gray-900">{expense.vendor?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expense Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {format(new Date(expense.expenseDate), 'PPP')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Reference Number</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.referenceNumber || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Invoice Number</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.invoiceNumber || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Submitted By</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.submitter?.firstName} {expense.submitter?.lastName}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="text-sm font-medium text-gray-900">{expense.description}</dd>
              </div>
            </dl>
          </div>

          {/* Amount Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Amount Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(expense.amount, expense.currency)}
                </span>
              </div>
              {expense.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">
                    {formatCurrency(expense.taxAmount, expense.currency)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(expense.totalAmount, expense.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Receipts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Receipts</h2>
            {expense.receipts && expense.receipts.length > 0 ? (
              <div className="space-y-3">
                {expense.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium text-gray-900">{receipt.fileName}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded {format(new Date(receipt.uploadedAt), 'PP')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewReceipt(receipt)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No receipts attached</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {(expense.status === 'DRAFT' ||
            expense.status === 'SUBMITTED' ||
            expense.status === 'PENDING_APPROVAL' ||
            expense.status === 'REJECTED' ||
            expense.status === 'CLARIFICATION_REQUESTED') && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {expense.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={handleSubmit}
                      disabled={isActionLoading || !expense.receipts?.length}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                    {!expense.receipts?.length && (
                      <p className="text-xs text-amber-600">Receipt required to submit</p>
                    )}
                    <Link
                      to={`/expenses/${expense.id}/edit`}
                      className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={handleDelete}
                      disabled={isActionLoading}
                      className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
                {(expense.status === 'SUBMITTED' || expense.status === 'PENDING_APPROVAL') && (
                  <button
                    onClick={handleWithdraw}
                    disabled={isActionLoading}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                )}
                {(expense.status === 'REJECTED' ||
                  expense.status === 'CLARIFICATION_REQUESTED') && (
                  <>
                    <button
                      onClick={handleResubmit}
                      disabled={isActionLoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isResubmitting ? 'Resubmitting...' : 'Resubmit'}
                    </button>
                    <Link
                      to={`/expenses/${expense.id}/edit`}
                      className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
                    >
                      Edit
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Approval History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h2>
            {approvalHistory.length > 0 ? (
              <div className="space-y-4">
                {approvalHistory.map((history) => (
                  <div key={history.id} className="flex items-start space-x-3 text-sm">
                    <div
                      className={`w-2 h-2 mt-2 rounded-full ${
                        history.action === 'APPROVED'
                          ? 'bg-green-600'
                          : history.action === 'REJECTED'
                            ? 'bg-red-600'
                            : 'bg-amber-600'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {history.action === 'APPROVED'
                          ? 'Approved'
                          : history.action === 'REJECTED'
                            ? 'Rejected'
                            : 'Clarification Requested'}
                        {history.approver && (
                          <>
                            {' '}
                            by {history.approver.firstName} {history.approver.lastName}
                          </>
                        )}
                      </p>
                      <p className="text-gray-500">{format(new Date(history.createdAt), 'PPp')}</p>
                      {history.comment && (
                        <p
                          className={`mt-1 ${
                            history.action === 'REJECTED'
                              ? 'text-red-600'
                              : history.action === 'CLARIFICATION_REQUESTED'
                                ? 'text-orange-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {history.action === 'REJECTED'
                            ? 'Reason: '
                            : history.action === 'CLARIFICATION_REQUESTED'
                              ? 'Question: '
                              : ''}
                          {history.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No approval history yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={isReceiptModalOpen}
        onClose={handleCloseReceiptModal}
        receipt={selectedReceipt}
      />
    </div>
  );
}
