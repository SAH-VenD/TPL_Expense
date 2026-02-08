import { useState } from 'react';
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
import { PageHeader, Badge, getStatusVariant, Spinner, showToast, Modal, ModalBody, ModalFooter } from '@/components/ui';

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

  const handleApprove = async (id: string) => {
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
          <button
            onClick={() => navigate('/pre-approvals/request')}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Request Pre-Approval
          </button>
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
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100"
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
                  <button
                    onClick={() => handleApprove(pa.id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: pa.id })}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
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
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No pre-approvals found.</p>
          <button
            onClick={() => navigate('/pre-approvals/request')}
            className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Request your first pre-approval
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preApprovals.map((pa) => (
                <tr key={pa.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/pre-approvals/${pa.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </button>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Please provide a reason..."
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setRejectModal(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
