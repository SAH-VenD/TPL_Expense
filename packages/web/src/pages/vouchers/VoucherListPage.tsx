import { useState } from 'react';
import { Link } from 'react-router-dom';

type VoucherStatus = 'REQUESTED' | 'APPROVED' | 'DISBURSED' | 'SETTLED' | 'OVERDUE';

interface Voucher {
  id: string;
  voucherNumber: string;
  purpose: string;
  requestedAmount: number;
  disbursedAmount: number;
  settledAmount: number;
  status: VoucherStatus;
  settlementDeadline: string;
  requester: { firstName: string; lastName: string };
}

const statusColors: Record<VoucherStatus, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  DISBURSED: 'bg-purple-100 text-purple-800',
  SETTLED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

export function VoucherListPage() {
  const [filter, setFilter] = useState<VoucherStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data
  const vouchers: Voucher[] = [
    {
      id: '1',
      voucherNumber: 'PCV-2024-00001',
      purpose: 'Office supplies and stationery',
      requestedAmount: 10000,
      disbursedAmount: 10000,
      settledAmount: 8500,
      status: 'DISBURSED',
      settlementDeadline: '2024-02-15',
      requester: { firstName: 'John', lastName: 'Doe' },
    },
    {
      id: '2',
      voucherNumber: 'PCV-2024-00002',
      purpose: 'Client entertainment',
      requestedAmount: 15000,
      disbursedAmount: 0,
      settledAmount: 0,
      status: 'REQUESTED',
      settlementDeadline: '2024-02-20',
      requester: { firstName: 'Jane', lastName: 'Smith' },
    },
  ];

  const filteredVouchers =
    filter === 'ALL'
      ? vouchers
      : vouchers.filter((v) => v.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Petty Cash Vouchers</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Request Voucher
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'REQUESTED', 'APPROVED', 'DISBURSED', 'SETTLED', 'OVERDUE'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status as VoucherStatus | 'ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Voucher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVouchers.map((voucher) => (
          <div key={voucher.id} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Link
                  to={`/vouchers/${voucher.id}`}
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  {voucher.voucherNumber}
                </Link>
                <p className="text-sm text-gray-500 mt-1">{voucher.purpose}</p>
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  statusColors[voucher.status]
                }`}
              >
                {voucher.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Requested:</span>
                <span className="font-medium">
                  PKR {voucher.requestedAmount.toLocaleString()}
                </span>
              </div>
              {voucher.disbursedAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Disbursed:</span>
                  <span className="font-medium">
                    PKR {voucher.disbursedAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {voucher.settledAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Settled:</span>
                  <span className="font-medium">
                    PKR {voucher.settledAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline:</span>
                <span className="font-medium">
                  {new Date(voucher.settlementDeadline).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Requested by: {voucher.requester.firstName}{' '}
                {voucher.requester.lastName}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to={`/vouchers/${voucher.id}`}
                className="flex-1 text-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View Details
              </Link>
              {voucher.status === 'DISBURSED' && (
                <button className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Settle
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredVouchers.length === 0 && (
        <div className="text-center py-12 card">
          <p className="text-gray-500">No vouchers found</p>
        </div>
      )}

      {/* Create Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Request Petty Cash Voucher
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="What is this voucher for?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (PKR)
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justification
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Explain why you need this amount..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
