import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserIcon,
  ShieldCheckIcon,
  KeyIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAppSelector } from '@/store/hooks';
import { PageHeader, Card, showToast } from '@/components/ui';
import { useChangePasswordMutation } from '@/features/auth/services/auth.service';

type TabType = 'profile' | 'permissions' | 'password';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
  { id: 'permissions', label: 'Role & Permissions', icon: <ShieldCheckIcon className="h-5 w-5" /> },
  { id: 'password', label: 'Change Password', icon: <KeyIcon className="h-5 w-5" /> },
];

const roleDescriptions: Record<
  string,
  { title: string; description: string; permissions: string[] }
> = {
  EMPLOYEE: {
    title: 'Employee',
    description: 'Standard user with access to personal expense management.',
    permissions: [
      'Create and manage own expenses',
      'Request petty cash vouchers',
      'View own approval history',
      'Access personal notifications',
    ],
  },
  APPROVER: {
    title: 'Approver',
    description: 'Can approve expenses within their department or approval tier.',
    permissions: [
      'All Employee permissions',
      'Approve/reject expenses in approval queue',
      'View team expenses',
      'Access approval reports',
    ],
  },
  SUPER_APPROVER: {
    title: 'Super Approver',
    description: 'Higher-level approver with elevated approval limits.',
    permissions: [
      'All Approver permissions',
      'Approve expenses exceeding standard limits',
      'Override lower-tier approvals',
      'View cross-department expenses',
    ],
  },
  FINANCE: {
    title: 'Finance',
    description: 'Finance team member with budget and payment management access.',
    permissions: [
      'All Approver permissions',
      'Manage budgets and allocations',
      'Process payments and reimbursements',
      'Access financial reports',
      'View all expenses organization-wide',
    ],
  },
  CEO: {
    title: 'CEO',
    description: 'Executive with full approval authority.',
    permissions: [
      'All Finance permissions',
      'Final approval authority for all expenses',
      'No approval limit restrictions',
      'Access executive dashboards',
    ],
  },
  ADMIN: {
    title: 'System Administrator',
    description: 'Full system administration access.',
    permissions: [
      'Manage users and roles',
      'Configure system settings',
      'Manage expense categories',
      'View audit logs',
      'Read-only access to approvals',
    ],
  },
};

export function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);

  const initialTab = (searchParams.get('tab') as TabType) || 'profile';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showToast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();
      showToast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      showToast.error(error.data?.message || 'Failed to change password');
    }
  };

  const handleAvatarUpload = () => {
    // UI placeholder - no backend integration
    showToast.success('Avatar upload functionality coming soon');
  };

  const roleInfo = user?.role ? roleDescriptions[user.role] : roleDescriptions.EMPLOYEE;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your account settings and preferences"
        breadcrumbs={[{ label: 'Profile' }]}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-3xl">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </span>
                </div>
                <button
                  onClick={handleAvatarUpload}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <CameraIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Upload a profile picture to personalize your account.
                </p>
                <button
                  onClick={handleAvatarUpload}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Upload new picture
                </button>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <p className="mt-1 text-gray-900">{user?.firstName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <p className="mt-1 text-gray-900">{user?.lastName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <p className="mt-1 text-gray-900">{user?.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="mt-1 text-gray-900">{user?.departmentName || 'Not assigned'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Contact your administrator to update your personal information.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* Current Role */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{roleInfo.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{roleInfo.description}</p>
              </div>
            </div>
          </Card>

          {/* Permissions List */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h3>
            <ul className="space-y-3">
              {roleInfo.permissions.map((permission, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{permission}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* What You Can't Do */}
          {user?.role !== 'ADMIN' && user?.role !== 'CEO' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restricted Actions</h3>
              <ul className="space-y-3">
                {user?.role === 'EMPLOYEE' && (
                  <>
                    <li className="flex items-start gap-3">
                      <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">Approve or reject expenses</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">Manage budgets</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">Access admin settings</span>
                    </li>
                  </>
                )}
                {(user?.role === 'APPROVER' || user?.role === 'SUPER_APPROVER') && (
                  <>
                    <li className="flex items-start gap-3">
                      <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">Manage system settings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">Manage users</span>
                    </li>
                  </>
                )}
                {user?.role === 'FINANCE' && (
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-500">Manage system settings</span>
                  </li>
                )}
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                Need additional permissions? Contact your administrator.
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'password' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
          <p className="mt-4 text-sm text-gray-500">
            Password must include uppercase, lowercase, number, and special character.
          </p>
        </Card>
      )}
    </div>
  );
}

export default ProfilePage;
