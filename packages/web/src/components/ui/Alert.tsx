import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  { icon: React.FC<{ className?: string }>; styles: string }
> = {
  success: {
    icon: CheckCircleIcon,
    styles: 'bg-green-50 border-green-200 text-green-800',
  },
  error: {
    icon: XCircleIcon,
    styles: 'bg-red-50 border-red-200 text-red-800',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    styles: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  info: {
    icon: InformationCircleIcon,
    styles: 'bg-blue-50 border-blue-200 text-blue-800',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={clsx('rounded-lg border p-4', config.styles, className)} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={clsx('text-sm', title && 'mt-1')}>{children}</div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

Alert.displayName = 'Alert';
