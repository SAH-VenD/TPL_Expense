import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartPieIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, Skeleton, EmptyState, Alert } from '@/components/ui';
import { useGetSpendByCategoryQuery } from '@/features/reports/services/reports.service';

export interface CategoryBreakdownChartProps {
  dateRange?: { start: Date; end: Date };
  limit?: number;
  variant?: 'pie' | 'donut';
  height?: number;
  onCategoryClick?: (categoryId: string) => void;
  className?: string;
}

const CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray (for "Other")
];

interface CategoryChartData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: CategoryChartData;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-medium text-gray-900">{data.categoryName}</p>
      <p className="text-sm text-gray-600 mt-1">{formatCurrency(data.amount)}</p>
      <p className="text-sm text-gray-500">{data.percentage.toFixed(1)}% of total</p>
    </div>
  );
};

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomLabelProps) => {
  if (percent < 0.05) return null; // Don't show label for small slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <Skeleton variant="circular" width={height * 0.6} height={height * 0.6} />
  </div>
);

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  dateRange,
  limit = 6,
  variant = 'donut',
  height = 300,
  onCategoryClick,
  className,
}) => {
  const filters = React.useMemo(() => {
    const result: { dateFrom?: string; dateTo?: string } = {};
    if (dateRange) {
      result.dateFrom = dateRange.start.toISOString().split('T')[0];
      result.dateTo = dateRange.end.toISOString().split('T')[0];
    }
    return result;
  }, [dateRange]);

  const { data, isLoading, isError, refetch } = useGetSpendByCategoryQuery(filters);

  const chartData: CategoryChartData[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort by amount and take top categories
    const sorted = [...data].sort((a, b) => b.totalAmount - a.totalAmount);
    const topCategories = sorted.slice(0, limit);
    const otherCategories = sorted.slice(limit);

    const result: CategoryChartData[] = topCategories.map((cat, index) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      amount: cat.totalAmount,
      percentage: cat.percentage,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

    // Combine remaining categories into "Other"
    if (otherCategories.length > 0) {
      const otherAmount = otherCategories.reduce(
        (sum, cat) => sum + cat.totalAmount,
        0
      );
      const otherPercentage = otherCategories.reduce(
        (sum, cat) => sum + cat.percentage,
        0
      );

      result.push({
        categoryId: 'other',
        categoryName: 'Other',
        amount: otherAmount,
        percentage: otherPercentage,
        color: CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
      });
    }

    return result;
  }, [data, limit]);

  const totalAmount = React.useMemo(
    () => chartData.reduce((sum, cat) => sum + cat.amount, 0),
    [chartData]
  );

  const handleClick = (data: CategoryChartData) => {
    if (data.categoryId !== 'other' && onCategoryClick) {
      onCategoryClick(data.categoryId);
    }
  };

  const innerRadius = variant === 'donut' ? 60 : 0;

  return (
    <Card padding="none" className={className}>
      <div className="p-6 border-b border-gray-200">
        <CardHeader className="mb-0">
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
      </div>
      <div className="p-4">
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : isError ? (
          <div className="py-8">
            <Alert variant="error" title="Failed to load chart data">
              <button
                onClick={() => refetch()}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
              >
                Try again
              </button>
            </Alert>
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={<ChartPieIcon className="h-6 w-6 text-gray-400" />}
            title="No category data"
            description="Start categorizing expenses to see the breakdown."
          />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={80}
                  dataKey="amount"
                  nameKey="categoryName"
                  label={renderCustomLabel}
                  labelLine={false}
                  onClick={(_, index) => handleClick(chartData[index])}
                  cursor={onCategoryClick ? 'pointer' : 'default'}
                  animationDuration={800}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.categoryId}
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value: string) => (
                    <span className="text-sm text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            {variant === 'donut' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center" style={{ marginRight: 100 }}>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

CategoryBreakdownChart.displayName = 'CategoryBreakdownChart';
