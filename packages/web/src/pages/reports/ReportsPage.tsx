import { useState } from 'react';
import { PageHeader, Spinner } from '@/components/ui';
import {
  useGetSpendByDepartmentQuery,
  useGetSpendByCategoryQuery,
  useGetSpendByVendorQuery,
  useGetBudgetVsActualQuery,
  useGetOutstandingAdvancesQuery,
  useGetTaxSummaryQuery,
  useExportReportMutation,
} from '@/features/reports/services/reports.service';

type ReportType =
  | 'spend-by-department'
  | 'spend-by-category'
  | 'spend-by-vendor'
  | 'budget-vs-actual'
  | 'outstanding-advances'
  | 'tax-summary';

interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'spend-by-department',
    name: 'Spend by Department',
    description: 'View expense breakdown by department',
    icon: '🏢',
  },
  {
    id: 'spend-by-category',
    name: 'Spend by Category',
    description: 'Analyze spending across expense categories',
    icon: '📊',
  },
  {
    id: 'spend-by-vendor',
    name: 'Spend by Vendor',
    description: 'See which vendors receive the most payments',
    icon: '🏪',
  },
  {
    id: 'budget-vs-actual',
    name: 'Budget vs Actual',
    description: 'Compare budgeted amounts with actual spending',
    icon: '📈',
  },
  {
    id: 'outstanding-advances',
    name: 'Outstanding Advances',
    description: 'Track unsettled petty cash advances',
    icon: '💰',
  },
  {
    id: 'tax-summary',
    name: 'Tax Summary',
    description: 'FBR compliance tax summary report',
    icon: '📋',
  },
];

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = {
    dateFrom: dateRange.startDate,
    dateTo: dateRange.endDate,
  };

  // Query hooks - only fetch when that report type is selected
  const { data: departmentData, isLoading: deptLoading } = useGetSpendByDepartmentQuery(filters, {
    skip: selectedReport !== 'spend-by-department',
  });
  const { data: categoryData, isLoading: catLoading } = useGetSpendByCategoryQuery(filters, {
    skip: selectedReport !== 'spend-by-category',
  });
  const { data: vendorData, isLoading: vendorLoading } = useGetSpendByVendorQuery(filters, {
    skip: selectedReport !== 'spend-by-vendor',
  });
  const { data: budgetData, isLoading: budgetLoading } = useGetBudgetVsActualQuery(filters, {
    skip: selectedReport !== 'budget-vs-actual',
  });
  const { data: advancesData, isLoading: advancesLoading } = useGetOutstandingAdvancesQuery(
    undefined,
    {
      skip: selectedReport !== 'outstanding-advances',
    },
  );
  const { data: taxData, isLoading: taxLoading } = useGetTaxSummaryQuery(
    { year: new Date().getFullYear() },
    { skip: selectedReport !== 'tax-summary' },
  );

  const [exportReport, { isLoading: isExporting }] = useExportReportMutation();

  const isLoading =
    deptLoading || catLoading || vendorLoading || budgetLoading || advancesLoading || taxLoading;

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!selectedReport) return;
    setExportError(null);

    try {
      const blob = await exportReport({
        reportType: selectedReport,
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }).unwrap();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport}-${dateRange.startDate}-to-${dateRange.endDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setExportError(error.data?.message || 'Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const renderReportContent = () => {
    if (!selectedReport) return null;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      );
    }

    switch (selectedReport) {
      case 'spend-by-department':
        if (!departmentData || departmentData.length === 0) {
          return (
            <EmptyState message="No department spending data available for the selected period." />
          );
        }
        return (
          <div className="space-y-4">
            {departmentData.map((dept) => (
              <div key={dept.departmentId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{dept.departmentName}</span>
                  <span className="font-medium">
                    {formatCurrency(dept.totalAmount)} ({dept.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{dept.count} expenses</p>
              </div>
            ))}
          </div>
        );

      case 'spend-by-category':
        if (!categoryData || categoryData.length === 0) {
          return (
            <EmptyState message="No category spending data available for the selected period." />
          );
        }
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categoryData.map((cat, index) => {
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-yellow-500',
                'bg-red-500',
                'bg-indigo-500',
              ];
              return (
                <div key={cat.categoryId} className="bg-gray-50 rounded-lg p-4">
                  <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]} mb-2`} />
                  <p className="text-sm text-gray-500">{cat.categoryName}</p>
                  <p className="text-lg font-semibold">{formatCurrency(cat.totalAmount)}</p>
                  <p className="text-xs text-gray-400">
                    {cat.count} expenses ({cat.percentage.toFixed(1)}%)
                  </p>
                </div>
              );
            })}
          </div>
        );

      case 'spend-by-vendor':
        if (!vendorData || vendorData.length === 0) {
          return (
            <EmptyState message="No vendor spending data available for the selected period." />
          );
        }
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendor
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vendorData.map((vendor, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{vendor.vendorName || 'Unknown'}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {formatCurrency(vendor.totalAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{vendor.count}</td>
                  <td className="px-4 py-2 text-sm text-right">{vendor.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'budget-vs-actual':
        if (!budgetData || budgetData.length === 0) {
          return <EmptyState message="No budget comparison data available." />;
        }
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Budget
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Budgeted
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Actual
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Variance
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgetData.map((row) => {
                const isOver = row.variance < 0;
                return (
                  <tr key={row.budgetId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{row.budgetName}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      {formatCurrency(row.budgetAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {formatCurrency(row.actualAmount)}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right ${isOver ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {isOver ? '-' : '+'}
                      {formatCurrency(Math.abs(row.variance))}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right ${isOver ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {row.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );

      case 'outstanding-advances':
        if (!advancesData || advancesData.length === 0) {
          return <EmptyState message="No outstanding advances found." />;
        }
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Voucher
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Disbursed
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Settled
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Outstanding
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Days
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {advancesData.map((adv) => (
                <tr key={adv.voucherId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-blue-600">{adv.voucherNumber}</td>
                  <td className="px-4 py-2 text-sm">{adv.employeeName}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {formatCurrency(adv.disbursedAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {formatCurrency(adv.settledAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium">
                    {formatCurrency(adv.outstanding)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span className={adv.daysOverdue > 30 ? 'text-red-600 font-medium' : ''}>
                      {adv.daysOverdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'tax-summary':
        if (!taxData) {
          return <EmptyState message="No tax data available for the selected year." />;
        }
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Fiscal Year {taxData.year}</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(taxData.totalTax)}</p>
              <p className="text-sm text-blue-600">Total Tax Collected</p>
            </div>
            {taxData.breakdown && taxData.breakdown.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tax Type
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {taxData.breakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{item.type}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate and export financial reports"
        breadcrumbs={[{ label: 'Reports' }]}
      />

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              selectedReport === report.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl block mb-2">{report.icon}</span>
            <h3 className="font-medium text-gray-900">{report.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Report Configuration */}
      {selectedReport && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {REPORTS.find((r) => r.id === selectedReport)?.name}
          </h2>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Error Display */}
          {exportError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {exportError}
            </div>
          )}

          {/* Export Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Report Data Preview */}
      {selectedReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Data</h3>
          {renderReportContent()}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <svg
        className="mx-auto h-12 w-12 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p>{message}</p>
    </div>
  );
}
