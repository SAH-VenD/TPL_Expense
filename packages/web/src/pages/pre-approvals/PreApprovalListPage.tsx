import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import {
  useGetPreApprovalsQuery,
  useGetPendingPreApprovalsQuery,
  useApprovePreApprovalMutation,
  useRejectPreApprovalMutation,
} from '@/features/pre-approvals/services/pre-approvals.service';
import type { PreApprovalStatus } from '@/features/pre-approvals/services/pre-approvals.service';
import { useRolePermissions } from '@/hooks';
import {
  PageHeader,
  Badge,
  getStatusVariant,
  Spinner,
  showToast,
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  EmptyState,
  Textarea,
} from '@/components/ui';

const statusOptions: { value: PreApprovalStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'USED', label: 'Used' },
];

export function PreApprovalListPage() {
  const navigate = useNavigate();
  const { canApprove } = useRolePermissions();
  const [statusFilter, setStatusFilter] = useState<PreApprovalStatus | ''>('');
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: preApprovals, isLoading } = useGetPreApprovalsQuery({
    status: statusFilter || undefined,
  });
  const { data: pendingApprovals } = useGetPendingPreApprovalsQuery(undefined, {
    skip: !canApprove,
  });
  const [approvePreApproval] = useApprovePreApprovalMutation();
  const [rejectPreApproval] = useRejectPreApprovalMutation();

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await approvePreApproval({ id }).unwrap();
      showToast.success('Pre-approval approved');
    } catch {
      showToast.error('Failed to approve pre-approval');
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await rejectPreApproval({ id: rejectModal.id, reason: rejectReason }).unwrap();
      showToast.success('Pre-approval rejected');
      setRejectModal(null);
      setRejectReason('');
    } catch {
      showToast.error('Failed to reject pre-approval');
    }
  };

  const handleRowClick = (id: string) => {
    navigate(`/pre-approvals/${id}`);
  };

  const formatCurrency = (amount: number, currency = 'PKR') =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Approvals"
        subtitle="Request and manage pre-approvals for expenses"
        breadcrumbs={[{ label: 'Pre-Approvals' }]}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/pre-approvals/request')}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Request Pre-Approval
          </Button>
        }
      />

      {/* Pending Approvals Section (for approvers) */}
      {canApprove && pendingApprovals && pendingApprovals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-medium text-amber-900 mb-3">
            Pending Your Review ({pendingApprovals.length})
          </h3>
          <div className="space-y-2">
            {pendingApprovals.map((pa) => (
              <div
                key={pa.id}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(pa.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(pa.id);
                  }
                }}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {pa.requester?.firstName} {pa.requester?.lastName} - {pa.category?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(pa.estimatedAmount, pa.currency)} - {pa.purpose}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => handleApprove(pa.id, e)}
                    className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRejectModal({ id: pa.id });
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PreApprovalStatus | '')}
          className="input w-auto"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pre-Approvals List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !preApprovals || preApprovals.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <EmptyState
            title="No pre-approvals found"
            description="Get started by requesting your first pre-approval."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/pre-approvals/request')}
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                Request Pre-Approval
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preApprovals.map((pa) => (
                <tr
                  key={pa.id}
                  onClick={() => handleRowClick(pa.id)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {pa.preApprovalNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{pa.category?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {pa.purpose || pa.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(pa.estimatedAmount, pa.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(pa.status)}>{pa.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(pa.expiresAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal isOpen onClose={() => setRejectModal(null)} title="Reject Pre-Approval">
          <ModalBody>
            <Textarea
              label="Reason for rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason..."
              required
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setRejectModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
