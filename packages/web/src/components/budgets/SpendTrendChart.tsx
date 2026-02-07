import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import type { Budget } from '@/features/budgets/services/budgets.service';

export interface SpendTrendDataPoint {
  date: string;
  amount: number;
  cumulativeAmount: number;
}

export interface SpendTrendChartProps {
  budget: Budget;
  data: SpendTrendDataPoint[];
  usedAmount?: number;
  className?: string;
}

const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatShortCurrency = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toString();
};

export const SpendTrendChart: React.FC<SpendTrendChartProps> = ({
  budget,
  data,
  usedAmount: usedAmountProp,
  className,
}) => {
  const usedAmount = usedAmountProp ?? 0;
  const warningThresholdAmount = (budget.totalAmount * budget.warningThreshold) / 100;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length && label) {
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.dataKey === 'amount' ? 'Daily Spend: ' : 'Cumulative: '}
              {formatCurrency(entry.value, budget.currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <p className="text-gray-500">No trend data available for this budget.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Trend</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              fontSize={11}
              tick={{ fill: '#6B7280' }}
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              fontSize={11}
              tick={{ fill: '#6B7280' }}
              tickLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatShortCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-sm text-gray-600">
                  {value === 'amount' ? 'Daily Spend' : 'Cumulative'}
                </span>
              )}
            />
            {/* Budget limit reference line */}
            <ReferenceLine
              y={budget.totalAmount}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{
                value: 'Budget Limit',
                position: 'right',
                fill: '#EF4444',
                fontSize: 11,
              }}
            />
            {/* Warning threshold reference line */}
            <ReferenceLine
              y={warningThresholdAmount}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              label={{
                value: `Warning (${budget.warningThreshold}%)`,
                position: 'right',
                fill: '#F59E0B',
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="cumulativeAmount"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Budget Limit</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(budget.totalAmount, budget.currency)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Warning Threshold</p>
          <p className="text-sm font-semibold text-amber-600">
            {formatCurrency(warningThresholdAmount, budget.currency)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Current Spend</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(usedAmount, budget.currency)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Remaining</p>
          <p
            className={clsx(
              'text-sm font-semibold',
              budget.totalAmount - usedAmount < 0 ? 'text-red-600' : 'text-green-600',
            )}
          >
            {formatCurrency(budget.totalAmount - usedAmount, budget.currency)}
          </p>
        </div>
      </div>
    </div>
  );
};

SpendTrendChart.displayName = 'SpendTrendChart';
