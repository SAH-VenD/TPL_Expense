import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '@/store/hooks';
import {
  useGetVoucherQuery,
  useSettleVoucherMutation,
} from '@/features/vouchers/services/vouchers.service';
import { VoucherActions } from '@/features/vouchers/components/VoucherActions';
import { Skeleton, Alert, showToast, Modal, ModalBody, ModalFooter } from '@/components/ui';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  VOUCHER_STATUS_CONFIG,
  VOUCHER_ROUTES,
  formatAmount,
  formatDate,
  getDaysUntilDeadline,
  calculateSettlementBalance,
} from '@/features/vouchers/types/vouchers.types';
import type { LinkedExpense, SettleVoucherDto } from '@/features/vouchers/types/vouchers.types';
import { useState, useEffect } from 'react';

export function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const {
    data: voucher,
    isLoading,
    isError,
    refetch,
  } = useGetVoucherQuery(id!, { skip: !id });

  // Settlement modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleNotes, setSettleNotes] = useState('');
  const [overspendJustification, setOverspendJustification] = useState('');
  const [cashReturnConfirmed, setCashReturnConfirmed] = useState(false);
  const [settleVoucher, { isLoading: isSettling }] = useSettleVoucherMutation();

  // Check for action=settle in URL
  useEffect(() => {
    if (searchParams.get('action') === 'settle' && voucher) {
      setShowSettleModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, voucher, setSearchParams]);

  const handleActionComplete = () => {
    refetch();
  };

  const expenses: LinkedExpense[] = voucher?.expenses || [];
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const disbursedAmount = voucher?.disbursedAmount || 0;
  const balance = calculateSettlementBalance(disbursedAmount, totalSpent);

  const handleSettle = async () => {
    if (!voucher) return;

    // Validation
    if (balance.balanceType === 'overspend' && !overspendJustification.trim()) {
      showToast.error('Please provide justification for overspend');
      return;
    }
    if (balance.balanceType === 'underspend' && !cashReturnConfirmed) {
      showToast.error('Please confirm cash return');
      return;
    }

    const data: SettleVoucherDto = {
      notes: settleNotes || undefined,
      overspendJustification: balance.balanceType === 'overspend' ? overspendJustification : undefined,
      cashReturnConfirmed: balance.balanceType === 'underspend' ? cashReturnConfirmed : undefined,
    };

    try {
      await settleVoucher({ id: voucher.id, data }).unwrap();
      showToast.success('Voucher settled successfully');
      setShowSettleModal(false);
      refetch();
    } catch (error: any) {
      showToast.error(error?.data?.message || 'Failed to settle voucher');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton width={40} height={40} variant="circular" />
          <div>
            <Skeleton width={200} height={28} />
            <Skeleton width={150} height={16} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton height={200} />
            <Skeleton height={180} />
            <Skeleton height={250} />
          </div>
          <div className="space-y-6">
            <Skeleton height={150} />
            <Skeleton height={200} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !voucher) {
    return (
      <div className="space-y-6">
        <Link
          to={VOUCHER_ROUTES.LIST}
          className="inline-flex items-center text-primary-600 hover:text-primary-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Vouchers
        </Link>
        <Alert variant="error" title="Failed to load voucher">
          <p>Unable to load voucher details. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 btn-primary inline-flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  const statusConfig = VOUCHER_STATUS_CONFIG[voucher.status];
  const daysUntilDeadline = voucher.settlementDeadline
    ? getDaysUntilDeadline(voucher.settlementDeadline)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link
            to={VOUCHER_ROUTES.LIST}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{voucher.voucherNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Requested by {voucher.requester.firstName} {voucher.requester.lastName}
              {voucher.requester.department && ` • ${voucher.requester.department.name}`}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            statusConfig.variant === 'success'
              ? 'bg-green-100 text-green-800'
              : statusConfig.variant === 'danger'
              ? 'bg-red-100 text-red-800'
              : statusConfig.variant === 'warning'
              ? 'bg-yellow-100 text-yellow-800'
              : statusConfig.variant === 'primary'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Voucher Details Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Voucher Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Purpose</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">{voucher.purpose}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Requested Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {formatDate(voucher.requestedAt || voucher.createdAt)}
                </dd>
              </div>
              {voucher.settlementDeadline && (
                <div>
                  <dt className="text-sm text-gray-500">Settlement Deadline</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(voucher.settlementDeadline)}
                    {daysUntilDeadline !== null && (
                      <span
                        className={`ml-2 text-xs ${
                          daysUntilDeadline < 0
                            ? 'text-red-600'
                            : daysUntilDeadline <= 3
                            ? 'text-yellow-600'
                            : 'text-gray-500'
                        }`}
                      >
                        ({daysUntilDeadline < 0 ? `${Math.abs(daysUntilDeadline)} days overdue` : `${daysUntilDeadline} days left`})
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {voucher.approvedBy && (
                <div>
                  <dt className="text-sm text-gray-500">Approved By</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {voucher.approvedBy.firstName} {voucher.approvedBy.lastName}
                  </dd>
                </div>
              )}
              {voucher.disbursedBy && (
                <div>
                  <dt className="text-sm text-gray-500">Disbursed By</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {voucher.disbursedBy.firstName} {voucher.disbursedBy.lastName}
                  </dd>
                </div>
              )}
              {voucher.notes && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Notes</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{voucher.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Amount Summary Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Amount Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Requested</span>
                <span className="font-medium">{formatAmount(voucher.requestedAmount)}</span>
              </div>
              {voucher.approvedAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved</span>
                  <span className="font-medium">{formatAmount(voucher.approvedAmount)}</span>
                </div>
              )}
              {voucher.disbursedAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Disbursed</span>
                  <span className="font-medium">{formatAmount(voucher.disbursedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-medium">{formatAmount(totalSpent)}</span>
              </div>
              {voucher.disbursedAmount && (
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Balance</span>
                  <span
                    className={`font-semibold ${
                      balance.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {balance.balance >= 0 ? '' : '-'}{formatAmount(Math.abs(balance.balance))}
                    <span className="text-xs ml-1">
                      ({balance.balanceType === 'underspend' ? 'to return' : balance.balanceType === 'overspend' ? 'overspent' : 'settled'})
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {voucher.disbursedAmount && voucher.disbursedAmount > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Utilization</span>
                  <span className="text-gray-700">
                    {Math.round((totalSpent / voucher.disbursedAmount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      totalSpent > voucher.disbursedAmount ? 'bg-red-600' : 'bg-primary-600'
                    }`}
                    style={{
                      width: `${Math.min((totalSpent / voucher.disbursedAmount) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Linked Expenses Card */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Linked Expenses ({expenses.length})
              </h2>
              {['DISBURSED', 'PARTIALLY_SETTLED', 'OVERDUE'].includes(voucher.status) &&
                user &&
                voucher.requesterId === user.id && (
                  <button
                    onClick={() => navigate(`/expenses/new?voucherId=${voucher.id}`)}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Expense
                  </button>
                )}
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No expenses linked yet</p>
                <p className="text-sm mt-1">Add expenses to track spending against this voucher</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Expense #
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          to={`/expenses/${expense.id}`}
                          className="text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {expense.expenseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {expense.description || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {expense.expenseDate ? formatDate(expense.expenseDate) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                            expense.status === 'APPROVED' || expense.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : expense.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {formatAmount(expense.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-sm font-semibold">
                      Total
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">
                      {formatAmount(totalSpent)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {user && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <VoucherActions
                voucher={voucher}
                userRole={user.role}
                userId={user.id}
                onActionComplete={handleActionComplete}
              />
            </div>
          )}

          {/* Timeline */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              {voucher.settledAt && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Settled</p>
                    <p className="text-gray-500">{new Date(voucher.settledAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {voucher.disbursedAt && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Disbursed{voucher.disbursedBy && ` by ${voucher.disbursedBy.firstName} ${voucher.disbursedBy.lastName}`}
                    </p>
                    <p className="text-gray-500">{new Date(voucher.disbursedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {voucher.approvedAt && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Approved{voucher.approvedBy && ` by ${voucher.approvedBy.firstName} ${voucher.approvedBy.lastName}`}
                    </p>
                    <p className="text-gray-500">{new Date(voucher.approvedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {voucher.status === 'REJECTED' && voucher.notes && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Rejected</p>
                    <p className="text-gray-500">{voucher.notes}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Requested</p>
                  <p className="text-gray-500">
                    {new Date(voucher.requestedAt || voucher.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Modal */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Settle Voucher"
        size="md"
      >
        <ModalBody>
          {/* Balance Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Disbursed:</span>
                <span className="ml-2 font-medium">{formatAmount(disbursedAmount)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Expenses:</span>
                <span className="ml-2 font-medium">{formatAmount(totalSpent)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-gray-700 font-medium">Balance:</span>
              <span
                className={`ml-2 font-semibold ${
                  balance.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatAmount(Math.abs(balance.balance))}
                <span className="text-xs ml-1">
                  ({balance.balanceType === 'underspend'
                    ? 'to return'
                    : balance.balanceType === 'overspend'
                    ? 'overspent'
                    : 'exact'})
                </span>
              </span>
            </div>
          </div>

          {/* Underspend - Cash Return Confirmation */}
          {balance.balanceType === 'underspend' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-3">
                You have {formatAmount(balance.balance)} unused. Please confirm you will return this amount.
              </p>
              <Checkbox
                label="I confirm that I will return the unused cash"
                checked={cashReturnConfirmed}
                onChange={(e) => setCashReturnConfirmed(e.target.checked)}
              />
            </div>
          )}

          {/* Overspend - Justification Required */}
          {balance.balanceType === 'overspend' && (
            <div className="mb-4">
              <Alert variant="warning" className="mb-3">
                You have overspent by {formatAmount(Math.abs(balance.balance))}. Please provide justification.
              </Alert>
              <Textarea
                label="Overspend Justification"
                placeholder="Explain why additional funds were needed..."
                value={overspendJustification}
                onChange={(e) => setOverspendJustification(e.target.value)}
                minRows={3}
                error={!overspendJustification.trim() ? 'Justification is required for overspend' : undefined}
              />
            </div>
          )}

          {/* Notes */}
          <Textarea
            label="Settlement Notes (Optional)"
            placeholder="Any additional notes about this settlement..."
            value={settleNotes}
            onChange={(e) => setSettleNotes(e.target.value)}
            minRows={2}
          />
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowSettleModal(false)}
            disabled={isSettling}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSettle}
            disabled={
              isSettling ||
              (balance.balanceType === 'underspend' && !cashReturnConfirmed) ||
              (balance.balanceType === 'overspend' && !overspendJustification.trim())
            }
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isSettling ? 'Settling...' : 'Complete Settlement'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
