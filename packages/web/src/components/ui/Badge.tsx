import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  primary: 'bg-primary-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full mr-1.5', dotStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

// Utility function to map status strings to badge variants
export const getStatusVariant = (status: string): BadgeVariant => {
  const statusMap: Record<string, BadgeVariant> = {
    // Expense statuses
    DRAFT: 'default',
    SUBMITTED: 'warning',
    PENDING_APPROVAL: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    PAID: 'info',
    CLARIFICATION_REQUESTED: 'warning',
    RESUBMITTED: 'warning',
    // User statuses
    ACTIVE: 'success',
    INACTIVE: 'default',
    LOCKED: 'danger',
    // Role types
    EMPLOYEE: 'info',
    APPROVER: 'primary',
    FINANCE: 'primary',
    ADMIN: 'danger',
  };
  return statusMap[status] || 'default';
};

Badge.displayName = 'Badge';
