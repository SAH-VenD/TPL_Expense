import { useState } from 'react';

type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
type RoleType = 'EMPLOYEE' | 'APPROVER' | 'FINANCE' | 'ADMIN';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  role: RoleType;
  department: { name: string };
  createdAt: string;
}

const statusColors: Record<UserStatus, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  LOCKED: 'bg-red-100 text-red-800',
};

const roleColors: Record<RoleType, string> = {
  EMPLOYEE: 'bg-blue-100 text-blue-800',
  APPROVER: 'bg-purple-100 text-purple-800',
  FINANCE: 'bg-indigo-100 text-indigo-800',
  ADMIN: 'bg-red-100 text-red-800',
};

export function UsersPage() {
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data
  const users: User[] = [
    {
      id: '1',
      email: 'john@tekcellent.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
      role: 'EMPLOYEE',
      department: { name: 'Engineering' },
      createdAt: '2024-01-01',
    },
    {
      id: '2',
      email: 'jane@tekcellent.com',
      firstName: 'Jane',
      lastName: 'Smith',
      status: 'ACTIVE',
      role: 'APPROVER',
      department: { name: 'Engineering' },
      createdAt: '2024-01-01',
    },
    {
      id: '3',
      email: 'bob@tekcellent.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      status: 'PENDING_APPROVAL',
      role: 'EMPLOYEE',
      department: { name: 'Sales' },
      createdAt: '2024-01-20',
    },
  ];

  const filteredUsers =
    filter === 'ALL' ? users : users.filter((u) => u.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Import CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'LOCKED'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status as UserStatus | 'ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {users.filter((u) => u.status === 'PENDING_APPROVAL').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>
              {users.filter((u) => u.status === 'PENDING_APPROVAL').length}
            </strong>{' '}
            user(s) pending approval
          </p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.department.name}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      roleColors[user.role]
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[user.status]
                    }`}
                  >
                    {user.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    {user.status === 'PENDING_APPROVAL' && (
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                        Approve
                      </button>
                    )}
                    <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    {user.status === 'ACTIVE' && (
                      <button className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50">
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="user@tekcellent.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="EMPLOYEE">Employee</option>
                  <option value="APPROVER">Approver</option>
                  <option value="FINANCE">Finance</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="">Select department</option>
                  <option value="1">Engineering</option>
                  <option value="2">Sales</option>
                  <option value="3">Marketing</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
