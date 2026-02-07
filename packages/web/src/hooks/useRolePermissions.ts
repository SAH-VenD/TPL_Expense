import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import type { RoleType } from '@/features/auth/types/auth.types';

/**
 * All valid role types for type guards.
 */
const ALL_ROLES = new Set<RoleType>([
  'EMPLOYEE',
  'APPROVER',
  'SUPER_APPROVER',
  'FINANCE',
  'CEO',
  'ADMIN',
]);

/**
 * Type guard to check if a string is a valid RoleType.
 */
function isValidRole(role: string | undefined): role is RoleType {
  return typeof role === 'string' && ALL_ROLES.has(role as RoleType);
}

export interface RolePermissions {
  // Data visibility
  canViewOrgWideData: boolean;
  canViewDepartmentData: boolean;

  // Approvals (ADMIN excluded - separation of duties)
  canApprove: boolean;
  canApproveHighestTier: boolean;
  canEmergencyApprove: boolean;

  // Budgets
  canCreateBudgets: boolean;
  canTransferBudgets: boolean;
  canConfigureApprovalTiers: boolean;

  // Admin
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAuditLogs: boolean;

  // Context
  departmentId?: string;
  departmentName?: string;
  scopeLabel: string;

  // Role checks
  isCEO: boolean;
  isFinance: boolean;
  isSuperApprover: boolean;
  isApprover: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
}

/**
 * Centralized hook for role-based permission calculations.
 *
 * This hook provides a comprehensive set of permission flags based on the
 * current user's role, following the RBAC model:
 *
 * - CEO: Highest tier approver, org-wide visibility, can emergency approve
 * - SUPER_APPROVER: Cross-department approver, org-wide visibility, can emergency approve
 * - FINANCE: Org-wide visibility, budget management, can emergency approve
 * - APPROVER: Department-scoped approvals
 * - ADMIN: System administration, no approval rights (separation of duties)
 * - EMPLOYEE: Basic expense submission
 */
export function useRolePermissions(): RolePermissions {
  const { user } = useAppSelector((state) => state.auth);
  const userRole = user?.role;
  const role: RoleType | undefined = isValidRole(userRole) ? userRole : undefined;

  return useMemo(() => {
    // Role flags
    const isCEO = role === 'CEO';
    const isFinance = role === 'FINANCE';
    const isSuperApprover = role === 'SUPER_APPROVER';
    const isApprover = role === 'APPROVER';
    const isAdmin = role === 'ADMIN';
    const isEmployee = role === 'EMPLOYEE';

    // Org-wide visibility: CEO, FINANCE, SUPER_APPROVER, ADMIN
    const isOrgWide = isCEO || isFinance || isSuperApprover || isAdmin;

    // Department-scoped visibility: APPROVER only
    const isDepartmentScoped = isApprover;

    return {
      // Data visibility
      canViewOrgWideData: isOrgWide,
      canViewDepartmentData: isDepartmentScoped || isOrgWide,

      // Approvals - ADMIN excluded for separation of duties
      canApprove: isApprover || isSuperApprover || isFinance || isCEO,
      canApproveHighestTier: isCEO,
      canEmergencyApprove: isCEO || isSuperApprover || isFinance,

      // Budget management
      canCreateBudgets: isFinance || isCEO || isAdmin,
      canTransferBudgets: isFinance || isCEO || isAdmin,
      canConfigureApprovalTiers: isCEO || isAdmin,

      // Admin capabilities
      canManageUsers: isAdmin,
      canManageSettings: isAdmin,
      canViewAuditLogs: isAdmin || isFinance || isCEO,

      // Context info
      departmentId: user?.departmentId,
      departmentName: user?.departmentName,
      scopeLabel: isOrgWide ? 'Organization' : user?.departmentName || 'Your Department',

      // Role flags for direct checks
      isCEO,
      isFinance,
      isSuperApprover,
      isApprover,
      isAdmin,
      isEmployee,
    };
  }, [user, role]);
}
