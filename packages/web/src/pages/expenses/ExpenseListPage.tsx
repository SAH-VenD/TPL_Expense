import { useState } from 'react';
import { Link } from 'react-router-dom';

type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

interface Expense {
  id: string;
  expenseNumber: string;
  description: string;
  amount: number;
  status: ExpenseStatus;
  category: string;
  expenseDate: string;
}

const statusColors: Record<ExpenseStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-blue-100 text-blue-800',
};

export function ExpenseListPage() {
  const [filter, setFilter] = useState<ExpenseStatus | 'ALL'>('ALL');

  // Mock data - will be replaced with API call
  const expenses: Expense[] = [
    {
      id: '1',
      expenseNumber: 'EXP-2024-00001',
      description: 'Office supplies for Q1',
      amount: 5000,
      status: 'APPROVED',
      category: 'Office Supplies',
      expenseDate: '2024-01-15',
    },
    {
      id: '2',
      expenseNumber: 'EXP-2024-00002',
      description: 'Client meeting lunch',
      amount: 3500,
      status: 'SUBMITTED',
      category: 'Meals & Entertainment',
      expenseDate: '2024-01-18',
    },
    {
      id: '3',
      expenseNumber: 'EXP-2024-00003',
      description: 'Travel to Lahore office',
      amount: 15000,
      status: 'DRAFT',
      category: 'Travel',
      expenseDate: '2024-01-20',
    },
  ];

  const filteredExpenses =
    filter === 'ALL'
      ? expenses
      : expenses.filter((exp) => exp.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status as ExpenseStatus | 'ALL')}
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

      {/* Expense Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expense #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                  <Link to={`/expenses/${expense.id}`}>
                    {expense.expenseNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {expense.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {expense.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(expense.expenseDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  PKR {expense.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[expense.status]
                    }`}
                  >
                    {expense.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    to={`/expenses/${expense.id}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No expenses found</p>
          </div>
        )}
      </div>
    </div>
  );
}
