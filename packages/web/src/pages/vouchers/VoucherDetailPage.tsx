import { useParams, Link } from 'react-router-dom';

export function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Mock data
  const voucher = {
    id,
    voucherNumber: 'PCV-2024-00001',
    status: 'DISBURSED',
    purpose: 'Office supplies and stationery for Q1',
    justification: 'Regular monthly supplies needed for the department.',
    requestedAmount: 10000,
    disbursedAmount: 10000,
    settledAmount: 8500,
    cashReturned: 0,
    settlementDeadline: '2024-02-15',
    requester: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@tekcellent.com',
      department: { name: 'Engineering' },
    },
    approvedBy: { firstName: 'Jane', lastName: 'Smith' },
    approvedAt: '2024-01-20T10:00:00',
    disbursedAt: '2024-01-21T14:00:00',
    expenses: [
      {
        id: 'e1',
        expenseNumber: 'EXP-2024-00010',
        description: 'Printer paper',
        amount: 3000,
        expenseDate: '2024-01-22',
      },
      {
        id: 'e2',
        expenseNumber: 'EXP-2024-00011',
        description: 'Pens and markers',
        amount: 1500,
        expenseDate: '2024-01-23',
      },
      {
        id: 'e3',
        expenseNumber: 'EXP-2024-00012',
        description: 'Notebooks',
        amount: 2000,
        expenseDate: '2024-01-24',
      },
    ],
    createdAt: '2024-01-19T09:00:00',
  };

  const statusColors: Record<string, string> = {
    REQUESTED: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    DISBURSED: 'bg-purple-100 text-purple-800',
    SETTLED: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
  };

  const totalSpent = voucher.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = voucher.disbursedAmount - totalSpent;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link
            to="/vouchers"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Vouchers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {voucher.voucherNumber}
          </h1>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            statusColors[voucher.status]
          }`}
        >
          {voucher.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Voucher Details
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Purpose</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {voucher.purpose}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Requester</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {voucher.requester.firstName} {voucher.requester.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Department</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {voucher.requester.department.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Settlement Deadline</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(voucher.settlementDeadline).toLocaleDateString()}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Justification</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {voucher.justification}
                </dd>
              </div>
            </dl>
          </div>

          {/* Amount Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Amount Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Requested</span>
                <span className="font-medium">
                  PKR {voucher.requestedAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Disbursed</span>
                <span className="font-medium">
                  PKR {voucher.disbursedAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-medium">
                  PKR {totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Remaining</span>
                <span
                  className={`font-semibold ${
                    remaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  PKR {remaining.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Utilization</span>
                <span className="text-gray-700">
                  {Math.round((totalSpent / voucher.disbursedAmount) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      (totalSpent / voucher.disbursedAmount) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Linked Expenses */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Linked Expenses
              </h2>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Add Expense
              </button>
            </div>
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {voucher.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        to={`/expenses/${expense.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expense.expenseNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium">
                      PKR {expense.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-sm font-semibold">
                    Total
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-semibold">
                    PKR {totalSpent.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {voucher.status === 'DISBURSED' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Settle Voucher
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Add Expense
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Disbursed</p>
                  <p className="text-gray-500">
                    {new Date(voucher.disbursedAt!).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    Approved by {voucher.approvedBy.firstName}{' '}
                    {voucher.approvedBy.lastName}
                  </p>
                  <p className="text-gray-500">
                    {new Date(voucher.approvedAt!).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Requested</p>
                  <p className="text-gray-500">
                    {new Date(voucher.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
