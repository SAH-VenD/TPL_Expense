import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { Budget, BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetUtilizationChartProps {
  budget: Budget;
  utilization?: BudgetUtilization;
  className?: string;
}

const COLORS = {
  used: '#3B82F6', // blue-500
  remaining: '#10B981', // green-500
  exceeded: '#EF4444', // red-500
};

const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const BudgetUtilizationChart: React.FC<BudgetUtilizationChartProps> = ({
  budget,
  utilization,
  className,
}) => {
  const usedAmount = utilization ? utilization.committed + utilization.spent : 0;
  const remaining = utilization?.available ?? budget.totalAmount;
  const isExceeded = remaining < 0;

  const data = isExceeded
    ? [
        { name: 'Budget', value: budget.totalAmount, color: COLORS.used },
        { name: 'Over Budget', value: Math.abs(remaining), color: COLORS.exceeded },
      ]
    : [
        { name: 'Used', value: usedAmount, color: COLORS.used },
        { name: 'Remaining', value: remaining, color: COLORS.remaining },
      ];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(item.value, budget.currency)}</p>
          <p className="text-xs text-gray-500">
            {((item.value / budget.totalAmount) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(budget.totalAmount, budget.currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Used Amount</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(usedAmount, budget.currency)}
          </p>
        </div>
      </div>
    </div>
  );
};

BudgetUtilizationChart.displayName = 'BudgetUtilizationChart';
