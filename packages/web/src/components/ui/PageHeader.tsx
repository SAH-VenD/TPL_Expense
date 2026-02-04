import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import clsx from 'clsx';

export interface PageHeaderProps {
  /** Page title displayed as h1 */
  title: string;
  /** Optional subtitle/description text */
  subtitle?: string;
  /** Breadcrumb items (Home is automatically prepended) */
  breadcrumbs: BreadcrumbItem[];
  /** Optional action elements (buttons, toggles) rendered on the right */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standardized page header component with consistent layout:
 * - Breadcrumbs at the top
 * - Title and optional subtitle on the left
 * - Action buttons/controls on the right
 * - Responsive layout that stacks on mobile
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx('space-y-4', className)}>
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbs} />

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

PageHeader.displayName = 'PageHeader';
