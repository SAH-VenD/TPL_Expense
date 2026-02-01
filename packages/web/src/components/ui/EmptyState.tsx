import React from 'react';
import { FolderOpenIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={clsx('text-center py-12 px-6', className)}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
        {icon || <FolderOpenIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />}
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
