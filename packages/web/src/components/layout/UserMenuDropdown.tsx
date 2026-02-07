import { useNavigate } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { UserIcon, ShieldCheckIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import clsx from 'clsx';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/features/auth/store/authSlice';
import { useLogoutMutation } from '@/features/auth/services/auth.service';

const roleLabels: Record<string, { label: string; color: string }> = {
  EMPLOYEE: { label: 'Employee', color: 'bg-gray-100 text-gray-700' },
  APPROVER: { label: 'Approver', color: 'bg-blue-100 text-blue-700' },
  SUPER_APPROVER: { label: 'Super Approver', color: 'bg-purple-100 text-purple-700' },
  FINANCE: { label: 'Finance', color: 'bg-green-100 text-green-700' },
  CEO: { label: 'CEO', color: 'bg-yellow-100 text-yellow-700' },
  ADMIN: { label: 'Admin', color: 'bg-red-100 text-red-700' },
};

export function UserMenuDropdown() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, refreshToken } = useAppSelector((state) => state.auth);
  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    if (refreshToken) {
      await logoutApi(refreshToken);
    }
    dispatch(logout());
    navigate('/login');
  };

  const roleInfo = user?.role ? roleLabels[user.role] : roleLabels.EMPLOYEE;

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-700 font-medium text-sm">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </span>
        </div>
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-lg">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span
                  className={clsx(
                    'inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full',
                    roleInfo.color,
                  )}
                >
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => navigate('/profile')}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700',
                    active ? 'bg-gray-100' : '',
                  )}
                >
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span>My Profile</span>
                </button>
              )}
            </MenuItem>

            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => navigate('/profile?tab=permissions')}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700',
                    active ? 'bg-gray-100' : '',
                  )}
                >
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                  <span>Role & Permissions</span>
                </button>
              )}
            </MenuItem>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-100 p-2">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600',
                    active ? 'bg-red-50' : '',
                  )}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Sign out</span>
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
