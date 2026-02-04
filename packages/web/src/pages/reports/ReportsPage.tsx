import { useState } from 'react';
import { PageHeader } from '@/components/ui';

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

const reports: ReportConfig[] = [
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
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    setLoading(true);
    // TODO: API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!selectedReport) return;
    // TODO: API call
    console.log('Exporting as', format);
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
        {reports.map((report) => (
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
            {reports.find((r) => r.id === selectedReport)?.name}
          </h2>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {selectedReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>

          {/* Sample Chart/Data */}
          {selectedReport === 'spend-by-department' && (
            <div className="space-y-4">
              {[
                { name: 'Engineering', amount: 250000, percentage: 35 },
                { name: 'Sales', amount: 180000, percentage: 25 },
                { name: 'Marketing', amount: 150000, percentage: 21 },
                { name: 'HR', amount: 80000, percentage: 11 },
                { name: 'Operations', amount: 55000, percentage: 8 },
              ].map((dept) => (
                <div key={dept.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{dept.name}</span>
                    <span className="font-medium">
                      PKR {dept.amount.toLocaleString()} ({dept.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedReport === 'spend-by-category' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Travel', amount: 180000, color: 'bg-blue-500' },
                { name: 'Office Supplies', amount: 95000, color: 'bg-green-500' },
                { name: 'Software', amount: 120000, color: 'bg-purple-500' },
                { name: 'Meals', amount: 65000, color: 'bg-yellow-500' },
              ].map((cat) => (
                <div key={cat.name} className="bg-gray-50 rounded-lg p-4">
                  <div className={`w-4 h-4 rounded-full ${cat.color} mb-2`} />
                  <p className="text-sm text-gray-500">{cat.name}</p>
                  <p className="text-lg font-semibold">
                    PKR {cat.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedReport === 'budget-vs-actual' && (
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
                {[
                  { name: 'Q1 Department Budget', budget: 500000, actual: 420000 },
                  { name: 'Travel Budget', budget: 200000, actual: 180000 },
                  { name: 'Training Budget', budget: 100000, actual: 85000 },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className="px-4 py-2 text-sm">{row.name}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      PKR {row.budget.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      PKR {row.actual.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-green-600">
                      PKR {(row.budget - row.actual).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {Math.round((row.actual / row.budget) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!['spend-by-department', 'spend-by-category', 'budget-vs-actual'].includes(
            selectedReport
          ) && (
            <div className="text-center py-12 text-gray-500">
              <p>Generate the report to see the preview</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
