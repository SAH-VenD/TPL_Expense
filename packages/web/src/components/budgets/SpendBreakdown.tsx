import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import clsx from 'clsx';
import type { Budget } from '@/features/budgets/services/budgets.service';

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface UserBreakdown {
  userId: string;
  userName: string;
  amount: number;
}

export interface TopExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  userName: string;
}

export interface SpendBreakdownProps {
  budget: Budget;
  byCategory: CategoryBreakdown[];
  byUser: UserBreakdown[];
  topExpenses: TopExpense[];
  className?: string;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
];

const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const SpendBreakdown: React.FC<SpendBreakdownProps> = ({
  budget,
  byCategory,
  byUser,
  topExpenses,
  className,
}) => {
  const [sortBy, setSortBy] = useState<'amount' | 'date'>('amount');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Sort and paginate expenses
  const sortedExpenses = [...topExpenses].sort((a, b) => {
    if (sortBy === 'amount') return b.amount - a.amount;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const paginatedExpenses = sortedExpenses.slice(
    page * pageSize,
    (page + 1) * pageSize
  );
  const totalPages = Math.ceil(topExpenses.length / pageSize);

  const CategoryTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryBreakdown }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3">
          <p className="font-medium text-gray-900">{data.category}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.amount, budget.currency)}
          </p>
          <p className="text-xs text-gray-500">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const UserTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: UserBreakdown }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3">
          <p className="font-medium text-gray-900">{data.userName}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.amount, budget.currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  const topUsersBySpend = [...byUser]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  if (byCategory.length === 0 && byUser.length === 0 && topExpenses.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <p className="text-gray-500">No expense data available for this budget.</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-8', className)}>
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category - Pie Chart */}
        {byCategory.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Spend by Category
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="category"
                    label={({ category, percentage }) =>
                      percentage > 5 ? `${category.substring(0, 10)}...` : ''
                    }
                    labelLine={false}
                  >
                    {byCategory.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">
                        {value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Spend by User - Bar Chart */}
        {topUsersBySpend.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Spenders
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUsersBySpend}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      formatCurrency(value, budget.currency).replace(budget.currency, '')
                    }
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="userName"
                    width={70}
                    fontSize={11}
                    tickFormatter={(value) =>
                      value.length > 12 ? `${value.substring(0, 12)}...` : value
                    }
                  />
                  <Tooltip content={<UserTooltip />} />
                  <Bar
                    dataKey="amount"
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top Expenses Table */}
      {topExpenses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Expenses</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'amount' | 'date');
                  setPage(0);
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="amount">Amount</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {expense.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {expense.userName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(expense.amount, budget.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {page * pageSize + 1} to{' '}
                {Math.min((page + 1) * pageSize, topExpenses.length)} of{' '}
                {topExpenses.length} expenses
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SpendBreakdown.displayName = 'SpendBreakdown';
