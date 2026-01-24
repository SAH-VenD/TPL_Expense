import { useState } from 'react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useApproveUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetDepartmentsQuery,
  type User,
} from '@/features/admin/services/admin.service';

type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
type RoleType = 'EMPLOYEE' | 'APPROVER' | 'FINANCE' | 'ADMIN';

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

interface CreateUserFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: RoleType;
  departmentId: string;
}

interface EditUserFormData {
  firstName: string;
  lastName: string;
  phone: string;
  role: RoleType;
  departmentId: string;
}

const initialFormData: CreateUserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'EMPLOYEE',
  departmentId: '',
};

const initialEditFormData: EditUserFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  role: 'EMPLOYEE',
  departmentId: '',
};

export function UsersPage() {
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'deactivate' | 'reactivate' | 'delete';
    userId: string;
    userName: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateUserFormData>(initialFormData);
  const [editFormData, setEditFormData] = useState<EditUserFormData>(initialEditFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Fetch users from API
  const { data: usersData, isLoading, error } = useGetUsersQuery({ search: searchTerm });
  const { data: departments } = useGetDepartmentsQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [approveUser, { isLoading: isApproving }] = useApproveUserMutation();
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = usersData?.data || [];

  const filteredUsers =
    filter === 'ALL' ? users : users.filter((u) => u.status === filter);

  const pendingCount = users.filter((u) => u.status === 'PENDING_APPROVAL').length;

  const handleApproveUser = async (userId: string) => {
    try {
      await approveUser(userId).unwrap();
    } catch (err) {
      console.error('Failed to approve user:', err);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await deactivateUser(userId).unwrap();
      setShowConfirmModal(null);
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await reactivateUser(userId).unwrap();
      setShowConfirmModal(null);
    } catch (err) {
      console.error('Failed to reactivate user:', err);
    }
  };

  const handleEditUser = (user: User) => {
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: '',
      role: user.role as RoleType,
      departmentId: user.departmentId || '',
    });
    setEditFormError(null);
    setShowEditModal(user);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setEditFormError(null);

    // Validate required fields
    if (!editFormData.firstName || !editFormData.lastName) {
      setEditFormError('First name and last name are required');
      return;
    }

    try {
      await updateUser({
        id: showEditModal.id,
        data: {
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          phone: editFormData.phone || undefined,
          role: editFormData.role,
          departmentId: editFormData.departmentId || undefined,
        },
      }).unwrap();
      setShowEditModal(null);
      setEditFormData(initialEditFormData);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setEditFormError(error.data?.message || 'Failed to update user');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(null);
    setEditFormData(initialEditFormData);
    setEditFormError(null);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId).unwrap();
      setShowConfirmModal(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate email domain
    if (!formData.email.endsWith('@tekcellent.com')) {
      setFormError('Email must be a @tekcellent.com address');
      return;
    }

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setFormError('First name, last name, and email are required');
      return;
    }

    try {
      await createUser({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        departmentId: formData.departmentId || undefined,
      }).unwrap();
      setShowCreateModal(false);
      setFormData(initialFormData);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setFormError(error.data?.message || 'Failed to create user');
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData(initialFormData);
    setFormError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600">Failed to load users. Please try again.</p>
      </div>
    );
  }

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
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full max-w-md"
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'LOCKED'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status as UserStatus | 'ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
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
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>{pendingCount}</strong> user(s) pending approval
          </p>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
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
                  {user.department?.name || 'Not assigned'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      roleColors[user.role as RoleType] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[user.status as UserStatus] || 'bg-gray-100 text-gray-800'
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
                      <button
                        onClick={() => handleApproveUser(user.id)}
                        disabled={isApproving}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isApproving ? 'Approving...' : 'Approve'}
                      </button>
                    )}
                    <button
                      onClick={() => handleEditUser(user)}
                      className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setShowConfirmModal({
                          type: 'delete',
                          userId: user.id,
                          userName: `${user.firstName} ${user.lastName}`,
                        })
                      }
                      className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                    {user.status === 'ACTIVE' && (
                      <button
                        onClick={() =>
                          setShowConfirmModal({
                            type: 'deactivate',
                            userId: user.id,
                            userName: `${user.firstName} ${user.lastName}`,
                          })
                        }
                        className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                      >
                        Deactivate
                      </button>
                    )}
                    {(user.status === 'INACTIVE' || user.status === 'LOCKED') && (
                      <button
                        onClick={() =>
                          setShowConfirmModal({
                            type: 'reactivate',
                            userId: user.id,
                            userName: `${user.firstName} ${user.lastName}`,
                          })
                        }
                        className="px-3 py-1 text-sm border border-green-300 text-green-700 rounded hover:bg-green-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h3>
            <form className="space-y-4" onSubmit={handleCreateUser}>
              {formError && (
                <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="user@tekcellent.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as RoleType })
                  }
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="APPROVER">Approver</option>
                  <option value="FINANCE">Finance</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  className="input"
                  value={formData.departmentId}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentId: e.target.value })
                  }
                >
                  <option value="">Select department</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                A temporary password will be generated and the user will be prompted to change it on first login.
              </p>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h3>
            <form className="space-y-4" onSubmit={handleUpdateUser}>
              {editFormError && (
                <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-sm text-red-700">{editFormError}</p>
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input bg-gray-100"
                  value={showEditModal.email}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editFormData.firstName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editFormData.lastName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Optional"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value as RoleType })
                  }
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="APPROVER">Approver</option>
                  <option value="FINANCE">Finance</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  className="input"
                  value={editFormData.departmentId}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, departmentId: e.target.value })
                  }
                >
                  <option value="">No department</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-primary disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {showConfirmModal.type === 'deactivate'
                ? 'Deactivate User'
                : showConfirmModal.type === 'delete'
                ? 'Delete User'
                : 'Reactivate User'}
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to {showConfirmModal.type}{' '}
              <strong>{showConfirmModal.userName}</strong>?
              {showConfirmModal.type === 'deactivate' &&
                ' They will no longer be able to log in.'}
              {showConfirmModal.type === 'delete' &&
                ' This action cannot be undone.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showConfirmModal.type === 'deactivate') {
                    handleDeactivateUser(showConfirmModal.userId);
                  } else if (showConfirmModal.type === 'delete') {
                    handleDeleteUser(showConfirmModal.userId);
                  } else {
                    handleReactivateUser(showConfirmModal.userId);
                  }
                }}
                disabled={isDeactivating || isReactivating || isDeleting}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  showConfirmModal.type === 'deactivate' || showConfirmModal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isDeactivating || isReactivating || isDeleting
                  ? 'Processing...'
                  : showConfirmModal.type === 'deactivate'
                  ? 'Deactivate'
                  : showConfirmModal.type === 'delete'
                  ? 'Delete'
                  : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
