/**
 * Role-based access control constants for frontend
 *
 * These constants define role groups for consistent access control across the application.
 * Following the RBAC model:
 * - CEO: Highest tier approver, org-wide visibility
 * - SUPER_APPROVER: Cross-department approver, org-wide visibility, emergency approvals
 * - FINANCE: Org-wide visibility, budget management, high-value approvals
 * - APPROVER: Department-scoped approvals
 * - ADMIN: System administration, NO approval rights (separation of duties)
 * - EMPLOYEE: Basic expense submission
 */
import type { RoleType } from '@/features/auth/types/auth.types';

/**
 * All roles - used for pages accessible to everyone.
 */
export const ALL_ROLES: RoleType[] = [
  'EMPLOYEE',
  'APPROVER',
  'SUPER_APPROVER',
  'FINANCE',
  'CEO',
  'ADMIN',
];

/**
 * Roles that can approve expenses (write actions).
 * ADMIN is excluded for separation of duties compliance.
 */
export const APPROVING_ROLES: RoleType[] = ['APPROVER', 'SUPER_APPROVER', 'FINANCE', 'CEO'];

/**
 * Roles that can view approval data (read-only access).
 * Includes ADMIN for audit visibility without approval authority.
 */
export const APPROVAL_READ_ROLES: RoleType[] = [
  'APPROVER',
  'SUPER_APPROVER',
  'FINANCE',
  'CEO',
  'ADMIN',
];

/**
 * Roles that can perform emergency approvals (bypass tier requirements).
 * Requires justification except for CEO.
 */
export const EMERGENCY_APPROVAL_ROLES: RoleType[] = ['CEO', 'SUPER_APPROVER', 'FINANCE'];

/**
 * Roles that can manage budgets (create, edit, transfer).
 */
export const BUDGET_MANAGEMENT_ROLES: RoleType[] = ['FINANCE', 'CEO', 'ADMIN'];

/**
 * Roles with organization-wide data visibility.
 */
export const ORG_WIDE_VISIBILITY_ROLES: RoleType[] = ['CEO', 'SUPER_APPROVER', 'FINANCE', 'ADMIN'];

/**
 * Roles that can access reports and analytics.
 */
export const REPORTING_ROLES: RoleType[] = ['SUPER_APPROVER', 'FINANCE', 'CEO', 'ADMIN'];

/**
 * Roles that can view admin navigation (Users, Settings, Audit Logs).
 */
export const ADMIN_NAV_ROLES: RoleType[] = ['ADMIN', 'FINANCE', 'CEO'];

/**
 * Check if a role is in a role group.
 */
export function hasRole(userRole: RoleType, allowedRoles: RoleType[]): boolean {
  return allowedRoles.includes(userRole);
}
