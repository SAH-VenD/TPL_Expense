import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Card, CardHeader, CardTitle, EmptyState, Alert } from '@/components/ui';
import { useGetMonthlyTrendQuery } from '@/features/reports/services/reports.service';

export interface SpendTrendChartProps {
  year?: number;
  showComparison?: boolean;
  height?: number;
  className?: string;
  departmentId?: string;
}

interface ChartDataPoint {
  month: string;
  monthName: string;
  currentYear: number;
  previousYear?: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
};

const formatTooltipValue = (value: number): string => {
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
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatTooltipValue(entry.value)}
        </p>
      ))}
    </div>
  );
};

const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="h-full flex items-end gap-2 px-8 pb-8">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded-t"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  </div>
);

export const SpendTrendChart: React.FC<SpendTrendChartProps> = ({
  year,
  showComparison = false,
  height = 300,
  className,
  departmentId,
}) => {
  const currentYear = year || new Date().getFullYear();

  const { data, isLoading, isError, refetch } = useGetMonthlyTrendQuery({
    year: currentYear,
    departmentId,
  });

  const { data: previousYearData } = useGetMonthlyTrendQuery(
    { year: currentYear - 1, departmentId },
    { skip: !showComparison }
  );

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!data?.months) return [];

    return data.months.map((month) => {
      const prevMonth = previousYearData?.months?.find(
        (m) => m.month === month.month
      );

      return {
        month: month.monthName.substring(0, 3),
        monthName: month.monthName,
        currentYear: month.totalAmount,
        previousYear: prevMonth?.totalAmount,
      };
    });
  }, [data?.months, previousYearData?.months]);

  const hasData = chartData.some((d) => d.currentYear > 0);

  return (
    <Card padding="none" className={className}>
      <div className="p-6 border-b border-gray-200">
        <CardHeader className="mb-0">
          <CardTitle>Spending Trend</CardTitle>
          {data && (
            <span className="text-sm text-gray-500 ml-2">
              {currentYear}
              {showComparison && ` vs ${currentYear - 1}`}
            </span>
          )}
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
        ) : !hasData ? (
          <EmptyState
            icon={<ChartBarIcon className="h-6 w-6 text-gray-400" />}
            title="No spending data"
            description="Start tracking expenses to see your spending trend."
          />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) =>
                  value === 'currentYear'
                    ? String(currentYear)
                    : String(currentYear - 1)
                }
              />
              <Line
                type="monotone"
                dataKey="currentYear"
                name="currentYear"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
              {showComparison && (
                <Line
                  type="monotone"
                  dataKey="previousYear"
                  name="previousYear"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#9CA3AF', strokeWidth: 2, r: 3 }}
                  animationDuration={1000}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {data && hasData && (
        <div className="px-6 pb-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            YTD Total: {formatTooltipValue(data.ytdTotal)}
          </span>
          <span>
            Monthly Avg: {formatTooltipValue(data.monthlyAverage)}
          </span>
          {data.yoyChangePercentage !== undefined && (
            <span
              className={clsx(
                'font-medium',
                data.yoyChangePercentage > 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {data.yoyChangePercentage > 0 ? '+' : ''}
              {data.yoyChangePercentage.toFixed(1)}% YoY
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

SpendTrendChart.displayName = 'SpendTrendChart';
