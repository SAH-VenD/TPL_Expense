import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/features/auth/store/authSlice';
import { useGetMeQuery } from '@/features/auth/services/auth.service';
import { NotificationBell } from '@/components/notifications';
import { CreateNewDropdown } from './CreateNewDropdown';
import { UserMenuDropdown } from './UserMenuDropdown';
import {
  ALL_ROLES,
  APPROVAL_READ_ROLES,
  BUDGET_MANAGEMENT_ROLES,
  REPORTING_ROLES,
  ADMIN_NAV_ROLES,
} from '@/constants/roles';
import type { RoleType } from '@/features/auth/types/auth.types';
import clsx from 'clsx';

type NavIcon = React.FC<React.SVGProps<SVGSVGElement>>;

const navigation: Array<{
  name: string;
  href: string;
  icon: NavIcon;
  roles: RoleType[];
}> = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ALL_ROLES },
  { name: 'Expenses', href: '/expenses', icon: CurrencyDollarIcon, roles: ALL_ROLES },
  // ADMIN has read-only access to Approvals (can view but not approve/reject)
  { name: 'Approvals', href: '/approvals', icon: CheckCircleIcon, roles: APPROVAL_READ_ROLES },
  {
    name: 'Pre-Approvals',
    href: '/pre-approvals',
    icon: ClipboardDocumentCheckIcon,
    roles: ALL_ROLES,
  },
  { name: 'Vouchers', href: '/vouchers', icon: TicketIcon, roles: ALL_ROLES },
  { name: 'Budgets', href: '/budgets', icon: BanknotesIcon, roles: BUDGET_MANAGEMENT_ROLES },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: REPORTING_ROLES },
];

const adminNavigation: Array<{ name: string; href: string; icon: NavIcon }> = [
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Categories', href: '/admin/categories', icon: TagIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: DocumentTextIcon },
];

export function MainLayout() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch user data if we have a token but no user data
  const { data: userData } = useGetMeQuery(undefined, {
    skip: !accessToken || !!user,
  });

  // Update user in store when fetched
  useEffect(() => {
    if (userData && !user) {
      dispatch(setUser(userData));
    }
  }, [userData, user, dispatch]);

  const filteredNavigation = navigation.filter((item) => user && item.roles.includes(user.role));

  const showAdminNav = user && ADMIN_NAV_ROLES.includes(user.role);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 lg:relative lg:z-auto flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="font-semibold text-gray-900">TPL Expense</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

            {showAdminNav && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase">
                    Administration
                  </p>
                </div>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={sidebarOpen}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {/* Create New Dropdown */}
              <CreateNewDropdown />

              {/* Notification Bell */}
              <NotificationBell position="header" />

              {/* User Menu */}
              <UserMenuDropdown />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
