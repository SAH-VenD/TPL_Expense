import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  useGetPreApprovalQuery,
  useApprovePreApprovalMutation,
  useRejectPreApprovalMutation,
} from '@/features/pre-approvals/services/pre-approvals.service';
import { useRolePermissions } from '@/hooks';
import {
  PageHeader,
  Badge,
  getStatusVariant,
  Spinner,
  Alert,
  showToast,
  Modal,
  ModalBody,
  ModalFooter,
} from '@/components/ui';

export function PreApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canApprove } = useRolePermissions();

  const { data: pa, isLoading, isError, refetch } = useGetPreApprovalQuery(id!, { skip: !id });
  const [approvePreApproval] = useApprovePreApprovalMutation();
  const [rejectPreApproval] = useRejectPreApprovalMutation();

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const formatCurrency = (amount: number, currency = 'PKR') =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);

  const handleApprove = async () => {
    if (!pa) return;
    try {
      await approvePreApproval({ id: pa.id }).unwrap();
      showToast.success('Pre-approval approved');
    } catch {
      showToast.error('Failed to approve pre-approval');
    }
  };

  const handleReject = async () => {
    if (!pa || !rejectReason.trim()) return;
    try {
      await rejectPreApproval({ id: pa.id, reason: rejectReason }).unwrap();
      showToast.success('Pre-approval rejected');
      setRejectModal(false);
      setRejectReason('');
    } catch {
      showToast.error('Failed to reject pre-approval');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !pa) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error"
          breadcrumbs={[
            { label: 'Pre-Approvals', href: '/pre-approvals' },
            { label: 'Details' },
          ]}
        />
        <Alert variant="error" title="Failed to load pre-approval">
          <p>Unable to load pre-approval details. Please try again.</p>
          <button onClick={() => refetch()} className="mt-4 btn-primary inline-flex items-center">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  const travelDetails = (pa as unknown as { travelDetails?: { destination?: string; departureDate?: string; returnDate?: string; purpose?: string } }).travelDetails;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pa.preApprovalNumber}
        subtitle={`Requested by ${pa.requester?.firstName ?? ''} ${pa.requester?.lastName ?? ''}`}
        breadcrumbs={[
          { label: 'Pre-Approvals', href: '/pre-approvals' },
          { label: pa.preApprovalNumber },
        ]}
        actions={<Badge variant={getStatusVariant(pa.status)}>{pa.status}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Category</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {pa.category?.name || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Estimated Amount</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {formatCurrency(pa.estimatedAmount, pa.currency)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Purpose</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {pa.purpose || pa.description}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Requested Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(pa.requestedAt || pa.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expires</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(pa.expiresAt).toLocaleDateString()}
                </dd>
              </div>
              {pa.approver && (
                <div>
                  <dt className="text-sm text-gray-500">Approver</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {pa.approver.firstName} {pa.approver.lastName}
                  </dd>
                </div>
              )}
              {pa.approvedAt && (
                <div>
                  <dt className="text-sm text-gray-500">Approved At</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(pa.approvedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {pa.rejectedAt && (
                <div>
                  <dt className="text-sm text-gray-500">Rejected At</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(pa.rejectedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {pa.rejectionReason && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Rejection Reason</dt>
                  <dd className="text-sm font-medium text-red-700 mt-1 bg-red-50 p-3 rounded">
                    {pa.rejectionReason}
                  </dd>
                </div>
              )}
              {pa.actualAmount != null && (
                <div>
                  <dt className="text-sm text-gray-500">Actual Amount</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {formatCurrency(pa.actualAmount, pa.currency)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Travel Details Card */}
          {travelDetails && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Travel Details</h2>
              <dl className="grid grid-cols-2 gap-4">
                {travelDetails.destination && (
                  <div>
                    <dt className="text-sm text-gray-500">Destination</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {travelDetails.destination}
                    </dd>
                  </div>
                )}
                {travelDetails.purpose && (
                  <div>
                    <dt className="text-sm text-gray-500">Travel Purpose</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {travelDetails.purpose}
                    </dd>
                  </div>
                )}
                {travelDetails.departureDate && (
                  <div>
                    <dt className="text-sm text-gray-500">Departure</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(travelDetails.departureDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {travelDetails.returnDate && (
                  <div>
                    <dt className="text-sm text-gray-500">Return</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(travelDetails.returnDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {canApprove && pa.status === 'PENDING' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              {pa.status === 'USED' && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Used</p>
                    <p className="text-gray-500">Pre-approval has been used for an expense</p>
                  </div>
                </div>
              )}
              {pa.status === 'EXPIRED' && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Expired</p>
                    <p className="text-gray-500">
                      {new Date(pa.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {pa.rejectedAt && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Rejected</p>
                    <p className="text-gray-500">
                      {new Date(pa.rejectedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {pa.approvedAt && (
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Approved
                      {pa.approver && ` by ${pa.approver.firstName} ${pa.approver.lastName}`}
                    </p>
                    <p className="text-gray-500">
                      {new Date(pa.approvedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Requested</p>
                  <p className="text-gray-500">
                    {new Date(pa.requestedAt || pa.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Back to list */}
          <button
            onClick={() => navigate('/pre-approvals')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Pre-Approvals
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <Modal isOpen onClose={() => setRejectModal(false)} title="Reject Pre-Approval">
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
              onClick={() => setRejectModal(false)}
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
