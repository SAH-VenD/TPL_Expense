import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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
  departmentId?: string;
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
  departmentId,
}) => {
  const filters = React.useMemo(() => {
    const result: { dateFrom?: string; dateTo?: string; departmentId?: string } = {};
    if (dateRange) {
      result.dateFrom = dateRange.start.toISOString().split('T')[0];
      result.dateTo = dateRange.end.toISOString().split('T')[0];
    }
    if (departmentId) {
      result.departmentId = departmentId;
    }
    return result;
  }, [dateRange, departmentId]);

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
      const otherAmount = otherCategories.reduce((sum, cat) => sum + cat.totalAmount, 0);
      const otherPercentage = otherCategories.reduce((sum, cat) => sum + cat.percentage, 0);

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
    [chartData],
  );

  const handleClick = (data: CategoryChartData) => {
    if (data.categoryId !== 'other' && onCategoryClick) {
      onCategoryClick(data.categoryId);
    }
  };

  const innerRadius = variant === 'donut' ? 55 : 0;
  const outerRadius = 90;

  // Format total for center display - shorter format for small spaces
  const formatCompactCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `Rs ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `Rs ${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

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
          <div className="flex items-center gap-4">
            {/* Chart container with fixed dimensions */}
            <div className="relative flex-shrink-0" style={{ width: 220, height: height }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    dataKey="amount"
                    nameKey="categoryName"
                    label={false}
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
                </PieChart>
              </ResponsiveContainer>
              {/* Center text - positioned absolutely within the donut hole */}
              {variant === 'donut' && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    // Constrain to the inner radius area to prevent overflow
                    padding: `${(height - innerRadius * 2) / 2}px ${(220 - innerRadius * 2) / 2}px`,
                  }}
                >
                  <div className="text-center max-w-full overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                      {formatCompactCurrency(totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              )}
            </div>
            {/* Legend with percentages */}
            <div className="flex-1 min-w-0 space-y-1 overflow-hidden">
              {chartData.map((entry) => {
                const isClickable = entry.categoryId !== 'other' && onCategoryClick;
                return (
                  <button
                    key={entry.categoryId}
                    type="button"
                    className="w-full flex items-center justify-between text-sm hover:bg-gray-50 rounded px-2 py-1.5 -mx-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    onClick={() => isClickable && onCategoryClick(entry.categoryId)}
                    disabled={!isClickable}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-700 truncate">{entry.categoryName}</span>
                    </div>
                    <span className="font-medium text-gray-900 ml-2 flex-shrink-0">
                      {entry.percentage.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

CategoryBreakdownChart.displayName = 'CategoryBreakdownChart';
