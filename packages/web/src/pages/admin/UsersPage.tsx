import { useState, useCallback, useMemo } from 'react';
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
import {
  DataTable,
  type Column,
  Modal,
  ModalBody,
  ModalFooter,
  ConfirmDialog,
  Badge,
  getStatusVariant,
  Input,
  Select,
  Card,
  Alert,
  Spinner,
  LoadingContent,
  EmptyState,
  PageHeader,
} from '@/components/ui';
import { MagnifyingGlassIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';

type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
type RoleType = 'EMPLOYEE' | 'APPROVER' | 'FINANCE' | 'ADMIN';

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

const roleOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'ADMIN', label: 'Admin' },
];

const statusFilterOptions = [
  { value: 'ALL', label: 'All Users' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'LOCKED', label: 'Locked' },
];

export function UsersPage() {
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'deactivate' | 'reactivate' | 'delete';
    user: User;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateUserFormData>(initialFormData);
  const [editFormData, setEditFormData] = useState<EditUserFormData>(initialEditFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Fetch users from API
  const { data: usersData, isLoading, error, refetch } = useGetUsersQuery({ search: searchTerm });
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [approveUser, { isLoading: isApproving }] = useApproveUserMutation();
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = usersData?.data || [];

  const filteredUsers = useMemo(() => {
    return filter === 'ALL' ? users : users.filter((u) => u.status === filter);
  }, [users, filter]);

  const pendingCount = users.filter((u) => u.status === 'PENDING_APPROVAL').length;

  const departmentOptions = useMemo(() => {
    return [
      { value: '', label: 'No department' },
      ...departments.map((dept) => ({
        value: dept.id,
        label: dept.name,
      })),
    ];
  }, [departments]);

  const handleApproveUser = useCallback(
    async (userId: string) => {
      try {
        await approveUser(userId).unwrap();
      } catch (err) {
        console.error('Failed to approve user:', err);
      }
    },
    [approveUser],
  );

  const handleDeactivateUser = useCallback(async () => {
    if (!confirmDialog || confirmDialog.type !== 'deactivate') return;
    try {
      await deactivateUser(confirmDialog.user.id).unwrap();
      setConfirmDialog(null);
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  }, [confirmDialog, deactivateUser]);

  const handleReactivateUser = useCallback(async () => {
    if (!confirmDialog || confirmDialog.type !== 'reactivate') return;
    try {
      await reactivateUser(confirmDialog.user.id).unwrap();
      setConfirmDialog(null);
    } catch (err) {
      console.error('Failed to reactivate user:', err);
    }
  }, [confirmDialog, reactivateUser]);

  const handleDeleteUser = useCallback(async () => {
    if (!confirmDialog || confirmDialog.type !== 'delete') return;
    try {
      await deleteUser(confirmDialog.user.id).unwrap();
      setConfirmDialog(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  }, [confirmDialog, deleteUser]);

  const handleEditUser = useCallback((user: User) => {
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: '',
      role: user.role as RoleType,
      departmentId: user.departmentId || '',
    });
    setEditFormError(null);
    setShowEditModal(user);
  }, []);

  const handleUpdateUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showEditModal) return;
      setEditFormError(null);

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
    },
    [showEditModal, editFormData, updateUser],
  );

  const handleCreateUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.email.endsWith('@tekcellent.com')) {
        setFormError('Email must be a @tekcellent.com address');
        return;
      }

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
    },
    [formData, createUser],
  );

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setFormData(initialFormData);
    setFormError(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(null);
    setEditFormData(initialEditFormData);
    setEditFormError(null);
  }, []);

  const columns: Column<User>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        render: (user) => (
          <div>
            <p className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (user) => (
          <span className="text-sm text-gray-500">{user.department?.name || 'Not assigned'}</span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (user) => <Badge variant={getStatusVariant(user.role)}>{user.role}</Badge>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (user) => (
          <Badge variant={getStatusVariant(user.status)}>{user.status.replace('_', ' ')}</Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'Joined',
        render: (user) => (
          <span className="text-sm text-gray-500">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (user) => (
          <div className="flex justify-end space-x-2">
            {user.status === 'PENDING_APPROVAL' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveUser(user.id);
                }}
                disabled={isApproving}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditUser(user);
              }}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDialog({ type: 'delete', user });
              }}
              className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
            >
              Delete
            </button>
            {user.status === 'ACTIVE' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({ type: 'deactivate', user });
                }}
                className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
              >
                Deactivate
              </button>
            )}
            {(user.status === 'INACTIVE' || user.status === 'LOCKED') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({ type: 'reactivate', user });
                }}
                className="px-3 py-1 text-sm border border-green-300 text-green-700 rounded hover:bg-green-50"
              >
                Reactivate
              </button>
            )}
          </div>
        ),
      },
    ],
    [handleApproveUser, handleEditUser, isApproving],
  );

  if (isLoading) {
    return <LoadingContent message="Loading users..." />;
  }

  if (error) {
    return (
      <Card className="text-center">
        <EmptyState
          title="Failed to load users"
          description="There was an error loading the user list. Please try again."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage user accounts and permissions"
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Users' }]}
        actions={
          <>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Import CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add User
            </button>
          </>
        }
      />

      {/* Search and Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <Select
            options={statusFilterOptions}
            value={filter}
            onChange={(value) => setFilter(value as UserStatus | 'ALL')}
            className="w-48"
          />
        </div>
      </Card>

      {/* Pending Approvals Alert */}
      {pendingCount > 0 && (
        <Alert variant="warning">
          <strong>{pendingCount}</strong> user(s) pending approval
        </Alert>
      )}

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UsersIcon className="h-6 w-6 text-gray-400" />}
            title="No users found"
            description={
              searchTerm
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding a new user.'
            }
            action={
              !searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add User
                </button>
              )
            }
          />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          keyExtractor={(user) => user.id}
          emptyMessage="No users found"
        />
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} title="Add New User" size="md">
        <form onSubmit={handleCreateUser}>
          <ModalBody>
            {formError && (
              <Alert variant="error" className="mb-4">
                {formError}
              </Alert>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="user@tekcellent.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Select
                label="Role"
                options={roleOptions}
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value as RoleType })}
              />
              <Select
                label="Department"
                options={departmentOptions}
                value={formData.departmentId}
                onChange={(value) => setFormData({ ...formData, departmentId: value })}
                placeholder="Select department"
              />
              <p className="text-xs text-gray-500">
                A temporary password will be generated and the user will be prompted to change it on
                first login.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
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
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center"
            >
              {isCreating && <Spinner size="sm" className="mr-2" />}
              Create User
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!showEditModal} onClose={closeEditModal} title="Edit User" size="md">
        <form onSubmit={handleUpdateUser}>
          <ModalBody>
            {editFormError && (
              <Alert variant="error" className="mb-4">
                {editFormError}
              </Alert>
            )}
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={showEditModal?.email || ''}
                disabled
                helperText="Email cannot be changed"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Phone"
                type="tel"
                placeholder="Optional"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
              <Select
                label="Role"
                options={roleOptions}
                value={editFormData.role}
                onChange={(value) => setEditFormData({ ...editFormData, role: value as RoleType })}
              />
              <Select
                label="Department"
                options={departmentOptions}
                value={editFormData.departmentId}
                onChange={(value) => setEditFormData({ ...editFormData, departmentId: value })}
                placeholder="No department"
              />
            </div>
          </ModalBody>
          <ModalFooter>
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
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center"
            >
              {isUpdating && <Spinner size="sm" className="mr-2" />}
              Save Changes
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'deactivate'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleDeactivateUser}
        title="Deactivate User"
        message={
          <>
            Are you sure you want to deactivate{' '}
            <strong>
              {confirmDialog?.user.firstName} {confirmDialog?.user.lastName}
            </strong>
            ? They will no longer be able to log in.
          </>
        }
        confirmText="Deactivate"
        variant="danger"
        loading={isDeactivating}
      />

      <ConfirmDialog
        isOpen={confirmDialog?.type === 'reactivate'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleReactivateUser}
        title="Reactivate User"
        message={
          <>
            Are you sure you want to reactivate{' '}
            <strong>
              {confirmDialog?.user.firstName} {confirmDialog?.user.lastName}
            </strong>
            ?
          </>
        }
        confirmText="Reactivate"
        variant="info"
        loading={isReactivating}
      />

      <ConfirmDialog
        isOpen={confirmDialog?.type === 'delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong>
              {confirmDialog?.user.firstName} {confirmDialog?.user.lastName}
            </strong>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
