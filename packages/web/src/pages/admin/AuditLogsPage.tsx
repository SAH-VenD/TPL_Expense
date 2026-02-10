import { useState } from 'react';
import { PageHeader, Spinner } from '@/components/ui';
import { useGetAuditLogsQuery, type AuditLog } from '@/features/admin/services/admin.service';

interface AuditLogFilters {
  action: string;
  entityType: string;
  page: number;
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'User', label: 'User' },
  { value: 'Expense', label: 'Expense' },
  { value: 'Voucher', label: 'Voucher' },
  { value: 'Category', label: 'Category' },
  { value: 'Budget', label: 'Budget' },
  { value: 'Department', label: 'Department' },
  { value: 'ApprovalTier', label: 'Approval Tier' },
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  APPROVE: 'bg-green-100 text-green-800',
  REJECT: 'bg-red-100 text-red-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  SUBMIT: 'bg-yellow-100 text-yellow-800',
  RESUBMIT: 'bg-yellow-100 text-yellow-800',
};

export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    action: '',
    entityType: '',
    page: 1,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const queryParams = {
    page: filters.page,
    ...(filters.action && { action: filters.action }),
    ...(filters.entityType && { entityType: filters.entityType }),
  };

  const { data, isLoading, isError, error } = useGetAuditLogsQuery(queryParams);

  const logs = data?.data || [];
  const pagination = data?.meta?.pagination;

  const handleClearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      page: 1,
    });
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 1 }),
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
    return JSON.stringify(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">Failed to load audit logs</div>
        <p className="text-gray-500 text-sm">
          {(error as { data?: { message?: string } })?.data?.message || 'Please try again later'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="View system activity and user actions"
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Audit Logs' }]}
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              id="action-filter"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="entity-type-filter" className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              id="entity-type-filter"
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit logs found matching your filters.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.createdAt)}</td>
                  <td className="px-6 py-4">
                    {log.user ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.user.firstName} {log.user.lastName}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">System</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{log.entityType}</p>
                      {log.entityId && <p className="text-xs text-blue-600">{log.entityId}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.ipAddress || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{pagination.page}</span> of{' '}
            <span className="font-medium">{pagination.totalPages}</span> ({pagination.total} total
            logs)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.totalPages}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Timestamp</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Action</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Entity Type</p>
                  <p className="text-sm text-gray-900">{selectedLog.entityType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Entity ID</p>
                  <p className="text-sm text-gray-900">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">User</p>
                  <p className="text-sm text-gray-900">
                    {selectedLog.user
                      ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}`
                      : 'System'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">IP Address</p>
                  <p className="text-sm text-gray-900">{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {selectedLog.oldValue && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Previous Value</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {formatValue(selectedLog.oldValue)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">New Value</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {formatValue(selectedLog.newValue)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
