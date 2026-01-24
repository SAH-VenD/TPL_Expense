import { useState } from 'react';

interface PendingApproval {
  id: string;
  expense: {
    id: string;
    expenseNumber: string;
    description: string;
    amount: number;
    totalAmount: number;
    category: { name: string };
    expenseDate: string;
  };
  submitter: {
    firstName: string;
    lastName: string;
    department: { name: string };
  };
  submittedAt: string;
  tierLevel: number;
}

export function ApprovalQueuePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Mock data
  const pendingApprovals: PendingApproval[] = [
    {
      id: '1',
      expense: {
        id: 'e1',
        expenseNumber: 'EXP-2024-00002',
        description: 'Client meeting lunch',
        amount: 3500,
        totalAmount: 4095,
        category: { name: 'Meals & Entertainment' },
        expenseDate: '2024-01-18',
      },
      submitter: {
        firstName: 'Jane',
        lastName: 'Smith',
        department: { name: 'Sales' },
      },
      submittedAt: '2024-01-19T09:00:00',
      tierLevel: 1,
    },
    {
      id: '2',
      expense: {
        id: 'e2',
        expenseNumber: 'EXP-2024-00003',
        description: 'Software subscription renewal',
        amount: 25000,
        totalAmount: 25000,
        category: { name: 'Software & Subscriptions' },
        expenseDate: '2024-01-20',
      },
      submitter: {
        firstName: 'Bob',
        lastName: 'Johnson',
        department: { name: 'Engineering' },
      },
      submittedAt: '2024-01-20T14:30:00',
      tierLevel: 2,
    },
  ];

  const handleSelectAll = () => {
    if (selectedIds.length === pendingApprovals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingApprovals.map((a) => a.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkApprove = () => {
    // TODO: API call
    console.log('Approving:', selectedIds);
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    // TODO: API call
    console.log('Rejecting:', selectedIds, 'Reason:', rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <div className="text-sm text-gray-500">
          {pendingApprovals.length} expense(s) awaiting your approval
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-primary-800 font-medium">
            {selectedIds.length} expense(s) selected
          </span>
          <div className="space-x-3">
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve Selected
            </button>
            <button
              onClick={handleBulkReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === pendingApprovals.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
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
                Tier
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingApprovals.map((approval) => (
              <tr key={approval.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(approval.id)}
                    onChange={() => handleSelect(approval.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-primary-600">
                      {approval.expense.expenseNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {approval.expense.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(approval.expense.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {approval.submitter.firstName} {approval.submitter.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {approval.submitter.department.name}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {approval.expense.category.name}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">
                    PKR {approval.expense.totalAmount.toLocaleString()}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-primary-800">
                    Tier {approval.tierLevel}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                      Approve
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                      Reject
                    </button>
                    <button className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700">
                      Clarify
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pendingApprovals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No pending approvals</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Expense(s)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Please provide a reason..."
                required
              />
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
