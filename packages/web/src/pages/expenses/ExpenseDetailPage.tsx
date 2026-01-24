import { useParams, Link } from 'react-router-dom';

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Mock data - will be replaced with API call
  const expense = {
    id,
    expenseNumber: 'EXP-2024-00001',
    type: 'OUT_OF_POCKET',
    status: 'SUBMITTED',
    description: 'Office supplies for Q1 including printer paper, pens, and notebooks',
    amount: 5000,
    taxAmount: 850,
    totalAmount: 5850,
    currency: 'PKR',
    category: { name: 'Office Supplies' },
    vendor: { name: 'Office Depot' },
    expenseDate: '2024-01-15',
    invoiceNumber: 'INV-2024-001',
    submitter: { firstName: 'John', lastName: 'Doe', email: 'john@tekcellent.com' },
    submittedAt: '2024-01-16T10:30:00',
    receipts: [
      { id: '1', fileName: 'receipt-001.pdf', uploadedAt: '2024-01-16' },
    ],
    approvalHistory: [
      {
        id: '1',
        action: 'SUBMITTED',
        approver: { firstName: 'John', lastName: 'Doe' },
        createdAt: '2024-01-16T10:30:00',
      },
    ],
    comments: [
      {
        id: '1',
        content: 'Please process this expense for the Q1 supplies.',
        author: { firstName: 'John', lastName: 'Doe' },
        createdAt: '2024-01-16T10:30:00',
      },
    ],
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SUBMITTED: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PAID: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link
            to="/expenses"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Expenses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {expense.expenseNumber}
          </h1>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            statusColors[expense.status]
          }`}
        >
          {expense.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Expense Details
            </h2>
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
                  {expense.category.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Vendor</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.vendor?.name || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expense Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(expense.expenseDate).toLocaleDateString()}
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
                  {expense.submitter.firstName} {expense.submitter.lastName}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {expense.description}
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
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {expense.currency} {expense.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  {expense.currency} {expense.taxAmount.toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-gray-900">
                  {expense.currency} {expense.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Receipts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Receipts</h2>
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
                        Uploaded {new Date(receipt.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {expense.status === 'DRAFT' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Submit for Approval
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Edit
                </button>
                <button className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Approval History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Approval History
            </h2>
            <div className="space-y-4">
              {expense.approvalHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-start space-x-3 text-sm"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {history.action} by {history.approver.firstName}{' '}
                      {history.approver.lastName}
                    </p>
                    <p className="text-gray-500">
                      {new Date(history.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
            <div className="space-y-4">
              {expense.comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {comment.author.firstName} {comment.author.lastName}
                    </span>
                    <span className="text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <textarea
                placeholder="Add a comment..."
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
