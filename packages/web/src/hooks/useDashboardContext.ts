import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import type { RoleType } from '@/features/auth/types/auth.types';

interface DashboardContext {
  /** Whether to show department-scoped data */
  isDepartmentScoped: boolean;
  /** The department ID to filter by (undefined for org-wide) */
  departmentId: string | undefined;
  /** User's role */
  role: RoleType | undefined;
  /** Whether user can see org-wide data */
  canViewOrgWide: boolean;
  /** Label for the dashboard scope (e.g., "Department Name" or "Organization") */
  scopeLabel: string;
  /** True if user is APPROVER without a department assigned */
  hasDepartmentWarning: boolean;
}

/**
 * Hook to provide role-based dashboard filtering context.
 *
 * - CEO, SUPER_APPROVER, FINANCE, and ADMIN users see organization-wide data
 * - APPROVER and EMPLOYEE users see department-scoped data
 */
export function useDashboardContext(): DashboardContext {
  const { user } = useAppSelector((state) => state.auth);

  return useMemo(() => {
    const role = user?.role;
    const departmentId = user?.departmentId;
    const departmentName = user?.departmentName;

    // CEO, SUPER_APPROVER, FINANCE, and ADMIN see org-wide data
    const canViewOrgWide = role === 'CEO' || role === 'SUPER_APPROVER' || role === 'FINANCE' || role === 'ADMIN';

    // APPROVER and EMPLOYEE see department-scoped data (if they have a department)
    const isDepartmentScoped = !canViewOrgWide && !!departmentId;

    // Warning if user should be scoped but has no department
    const hasDepartmentWarning = !canViewOrgWide && !departmentId;

    return {
      isDepartmentScoped,
      departmentId: isDepartmentScoped ? departmentId : undefined,
      role,
      canViewOrgWide,
      scopeLabel: isDepartmentScoped
        ? (departmentName || 'Your Department')
        : 'Organization',
      hasDepartmentWarning,
    };
  }, [user]);
}
