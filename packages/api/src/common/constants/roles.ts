/**
 * Role-based access control constants
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
import { RoleType } from '@prisma/client';

/**
 * Roles that can approve expenses.
 * ADMIN is excluded for separation of duties compliance.
 */
export const APPROVING_ROLES: RoleType[] = [
  RoleType.APPROVER,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.CEO,
];

/**
 * Roles that can perform emergency approvals (bypass tier requirements).
 * Requires justification except for CEO.
 */
export const EMERGENCY_APPROVAL_ROLES: RoleType[] = [
  RoleType.CEO,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
];

/**
 * Roles that can manage budgets (create, edit, transfer).
 */
export const BUDGET_MANAGEMENT_ROLES: RoleType[] = [RoleType.FINANCE, RoleType.CEO, RoleType.ADMIN];

/**
 * Roles with organization-wide data visibility.
 */
export const ORG_WIDE_VISIBILITY_ROLES: RoleType[] = [
  RoleType.CEO,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.ADMIN,
];

/**
 * Roles that can access reports and analytics.
 */
export const REPORTING_ROLES: RoleType[] = [
  RoleType.APPROVER,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.CEO,
  RoleType.ADMIN,
];

/**
 * Roles that can view admin navigation (Users, Settings, Audit Logs).
 */
export const ADMIN_NAV_ROLES: RoleType[] = [RoleType.ADMIN, RoleType.FINANCE, RoleType.CEO];

/**
 * Roles that can configure approval tiers.
 */
export const TIER_CONFIG_ROLES: RoleType[] = [RoleType.CEO, RoleType.ADMIN];

/**
 * Roles that can view audit logs.
 */
export const AUDIT_LOG_ROLES: RoleType[] = [RoleType.ADMIN, RoleType.FINANCE, RoleType.CEO];

/**
 * All valid role types for type guards.
 */
export const ALL_ROLES: RoleType[] = [
  RoleType.EMPLOYEE,
  RoleType.APPROVER,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.CEO,
  RoleType.ADMIN,
];

/**
 * Type guard to check if a string is a valid RoleType.
 */
export function isValidRole(role: string): role is RoleType {
  return ALL_ROLES.includes(role as RoleType);
}

/**
 * Check if a role is in a role group.
 */
export function hasRole(userRole: RoleType, allowedRoles: RoleType[]): boolean {
  return allowedRoles.includes(userRole);
}
