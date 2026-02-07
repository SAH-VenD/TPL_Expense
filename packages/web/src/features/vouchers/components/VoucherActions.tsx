import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  XMarkIcon,
  BanknotesIcon,
  DocumentCheckIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import type { RoleType } from '@/features/auth/types/auth.types';
import type { Voucher } from '../types/vouchers.types';
import {
  useApproveVoucherMutation,
  useRejectVoucherMutation,
  useDisburseVoucherMutation,
  useDeleteVoucherMutation,
} from '../services/vouchers.service';
import { canUserPerformAction, formatAmount, VOUCHER_ROUTES } from '../types/vouchers.types';

export interface VoucherActionsProps {
  voucher: Voucher;
  userRole: RoleType;
  userId: string;
  onActionComplete: () => void;
}

export const VoucherActions: React.FC<VoucherActionsProps> = ({
  voucher,
  userRole,
  userId,
  onActionComplete,
}) => {
  const navigate = useNavigate();

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [approvedAmount, setApprovedAmount] = useState(voucher.requestedAmount);
  const [rejectReason, setRejectReason] = useState('');
  const [disbursedAmount, setDisbursedAmount] = useState(
    voucher.approvedAmount || voucher.requestedAmount,
  );
  const [error, setError] = useState<string | null>(null);

  // RTK Query mutations
  const [approveVoucher, { isLoading: isApproving }] = useApproveVoucherMutation();
  const [rejectVoucher, { isLoading: isRejecting }] = useRejectVoucherMutation();
  const [disburseVoucher, { isLoading: isDisbursing }] = useDisburseVoucherMutation();
  const [deleteVoucher, { isLoading: isDeleting }] = useDeleteVoucherMutation();

  // Permission checks
  const canEdit = canUserPerformAction('edit', userRole, userId, voucher);
  const canDelete = canUserPerformAction('delete', userRole, userId, voucher);
  const canApprove = canUserPerformAction('approve', userRole, userId, voucher);
  const canReject = canUserPerformAction('reject', userRole, userId, voucher);
  const canDisburse = canUserPerformAction('disburse', userRole, userId, voucher);
  const canSettle = canUserPerformAction('settle', userRole, userId, voucher);

  const handleApprove = async () => {
    setError(null);
    try {
      await approveVoucher({
        id: voucher.id,
        data: { approvedAmount },
      }).unwrap();
      setShowApproveModal(false);
      onActionComplete();
    } catch (err) {
      setError(
        (err as { data?: { message?: string } })?.data?.message || 'Failed to approve voucher',
      );
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    setError(null);
    try {
      await rejectVoucher({
        id: voucher.id,
        data: { reason: rejectReason },
      }).unwrap();
      setShowRejectModal(false);
      onActionComplete();
    } catch (err) {
      setError(
        (err as { data?: { message?: string } })?.data?.message || 'Failed to reject voucher',
      );
    }
  };

  const handleDisburse = async () => {
    if (disbursedAmount <= 0) {
      setError('Disbursed amount must be greater than 0');
      return;
    }
    if (disbursedAmount > voucher.requestedAmount) {
      setError('Disbursed amount cannot exceed requested amount');
      return;
    }
    setError(null);
    try {
      await disburseVoucher({
        id: voucher.id,
        data: { amount: disbursedAmount },
      }).unwrap();
      setShowDisburseModal(false);
      onActionComplete();
    } catch (err) {
      setError(
        (err as { data?: { message?: string } })?.data?.message || 'Failed to disburse voucher',
      );
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteVoucher(voucher.id).unwrap();
      setShowDeleteConfirm(false);
      navigate(VOUCHER_ROUTES.LIST);
    } catch (err) {
      setError(
        (err as { data?: { message?: string } })?.data?.message || 'Failed to delete voucher',
      );
    }
  };

  const handleSettle = () => {
    // Navigate to settlement page/modal - this will open the SettlementForm
    navigate(`${VOUCHER_ROUTES.DETAIL(voucher.id)}?action=settle`);
  };

  const hasActions = canEdit || canDelete || canApprove || canReject || canDisburse || canSettle;

  if (!hasActions) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Owner Actions - Edit/Delete */}
      {(canEdit || canDelete) && (
        <div className="flex flex-col space-y-2">
          {canEdit && (
            <button
              onClick={() => navigate(`${VOUCHER_ROUTES.DETAIL(voucher.id)}?action=edit`)}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Voucher
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Voucher
            </button>
          )}
        </div>
      )}

      {/* Approver Actions */}
      {(canApprove || canReject) && (
        <div className="flex flex-col space-y-2">
          {canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Approve
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowRejectModal(true)}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Reject
            </button>
          )}
        </div>
      )}

      {/* Finance Actions - Disburse */}
      {canDisburse && (
        <button
          onClick={() => setShowDisburseModal(true)}
          className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <BanknotesIcon className="h-4 w-4 mr-2" />
          Disburse Cash
        </button>
      )}

      {/* Settlement Action */}
      {canSettle && (
        <button
          onClick={handleSettle}
          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            voucher.status === 'OVERDUE'
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
          }`}
        >
          <DocumentCheckIcon className="h-4 w-4 mr-2" />
          {voucher.status === 'OVERDUE' ? 'Settle Now (Overdue)' : 'Settle Voucher'}
        </button>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Voucher"
        size="md"
      >
        <ModalBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          <p className="text-sm text-gray-600 mb-4">
            Approve voucher <span className="font-medium">{voucher.voucherNumber}</span> for{' '}
            <span className="font-medium">
              {voucher.requester.firstName} {voucher.requester.lastName}
            </span>
          </p>
          <Input
            label="Approved Amount (PKR)"
            type="number"
            min={1}
            max={voucher.requestedAmount}
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(Number(e.target.value))}
            helperText={`Requested amount: ${formatAmount(voucher.requestedAmount)}`}
          />
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowApproveModal(false)}
            disabled={isApproving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isApproving && <Spinner size="sm" className="mr-2" />}
            Approve
          </button>
        </ModalFooter>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Voucher"
        size="md"
      >
        <ModalBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          <p className="text-sm text-gray-600 mb-4">
            Reject voucher <span className="font-medium">{voucher.voucherNumber}</span>
          </p>
          <Textarea
            label="Reason for Rejection"
            placeholder="Please provide a reason for rejecting this voucher..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            minRows={3}
            error={!rejectReason.trim() ? 'Reason is required' : undefined}
          />
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowRejectModal(false)}
            disabled={isRejecting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isRejecting || !rejectReason.trim()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isRejecting && <Spinner size="sm" className="mr-2" />}
            Reject
          </button>
        </ModalFooter>
      </Modal>

      {/* Disburse Modal */}
      <Modal
        isOpen={showDisburseModal}
        onClose={() => setShowDisburseModal(false)}
        title="Disburse Petty Cash"
        size="md"
      >
        <ModalBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          <p className="text-sm text-gray-600 mb-4">
            Disburse cash for voucher <span className="font-medium">{voucher.voucherNumber}</span>{' '}
            to{' '}
            <span className="font-medium">
              {voucher.requester.firstName} {voucher.requester.lastName}
            </span>
          </p>
          <Input
            label="Disbursed Amount (PKR)"
            type="number"
            min={1}
            max={voucher.requestedAmount}
            value={disbursedAmount}
            onChange={(e) => setDisbursedAmount(Number(e.target.value))}
            helperText={`Approved amount: ${formatAmount(voucher.approvedAmount || voucher.requestedAmount)}`}
          />
          <Alert variant="info" className="mt-4">
            <p className="text-sm">
              Settlement deadline will be set to <span className="font-medium">7 days</span> from
              disbursement.
            </p>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowDisburseModal(false)}
            disabled={isDisbursing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDisburse}
            disabled={isDisbursing || disbursedAmount <= 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isDisbursing && <Spinner size="sm" className="mr-2" />}
            Disburse
          </button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Voucher"
        message={
          <div>
            <p>
              Are you sure you want to delete voucher{' '}
              <span className="font-medium">{voucher.voucherNumber}</span>?
            </p>
            <p className="mt-2 text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        }
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

VoucherActions.displayName = 'VoucherActions';
