import { useState } from 'react';
import { PageHeader } from '@/components/ui';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  user: { firstName: string; lastName: string; email: string };
  ipAddress?: string;
  createdAt: string;
}

export function AuditLogsPage() {
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  // Mock data
  const logs: AuditLog[] = [
    {
      id: '1',
      action: 'CREATE',
      entityType: 'Expense',
      entityId: 'EXP-2024-00001',
      user: { firstName: 'John', lastName: 'Doe', email: 'john@tekcellent.com' },
      ipAddress: '192.168.1.100',
      createdAt: '2024-01-24T10:30:00',
    },
    {
      id: '2',
      action: 'APPROVE',
      entityType: 'Expense',
      entityId: 'EXP-2024-00001',
      user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@tekcellent.com' },
      ipAddress: '192.168.1.101',
      createdAt: '2024-01-24T11:00:00',
    },
    {
      id: '3',
      action: 'LOGIN',
      entityType: 'User',
      user: { firstName: 'Bob', lastName: 'Johnson', email: 'bob@tekcellent.com' },
      ipAddress: '192.168.1.102',
      createdAt: '2024-01-24T09:00:00',
    },
    {
      id: '4',
      action: 'UPDATE',
      entityType: 'Category',
      entityId: 'TRAVEL',
      user: { firstName: 'Admin', lastName: 'User', email: 'admin@tekcellent.com' },
      ipAddress: '192.168.1.1',
      createdAt: '2024-01-23T15:30:00',
    },
    {
      id: '5',
      action: 'REJECT',
      entityType: 'Expense',
      entityId: 'EXP-2024-00002',
      user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@tekcellent.com' },
      ipAddress: '192.168.1.101',
      createdAt: '2024-01-23T14:00:00',
    },
  ];

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    APPROVE: 'bg-green-100 text-green-800',
    REJECT: 'bg-red-100 text-red-800',
    LOGIN: 'bg-gray-100 text-gray-800',
    LOGOUT: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="View system activity and user actions"
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Audit Logs' }]}
        actions={
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export Logs
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) =>
                setFilters({ ...filters, entityType: e.target.value })
              }
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="User">User</option>
              <option value="Expense">Expense</option>
              <option value="Voucher">Voucher</option>
              <option value="Category">Category</option>
              <option value="Budget">Budget</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
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
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  action: '',
                  entityType: '',
                  userId: '',
                  startDate: '',
                  endDate: '',
                })
              }
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.user.firstName} {log.user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{log.user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      actionColors[log.action] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-gray-900">{log.entityType}</p>
                    {log.entityId && (
                      <p className="text-xs text-blue-600">{log.entityId}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.ipAddress || '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to{' '}
          <span className="font-medium">{logs.length}</span> of{' '}
          <span className="font-medium">100</span> results
        </div>
        <div className="flex space-x-2">
          <button
            disabled
            className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed"
          >
            Previous
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
