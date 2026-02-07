import React from 'react';
import clsx from 'clsx';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-12 w-12 border-3',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => {
  return (
    <div className={clsx('inline-flex items-center', className)} role="status">
      <div
        className={clsx(
          'animate-spin rounded-full border-primary-600 border-t-transparent',
          sizeStyles[size],
        )}
      />
      {label && <span className="ml-2 text-sm text-gray-600">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
};

// Full page loading spinner
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
    <div className="text-center">
      <Spinner size="xl" />
      <p className="mt-4 text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

// Inline loading for content areas
export const LoadingContent: React.FC<{ message?: string; className?: string }> = ({
  message,
  className,
}) => (
  <div className={clsx('flex items-center justify-center py-12', className)}>
    <Spinner size="lg" label={message} />
  </div>
);

Spinner.displayName = 'Spinner';
LoadingOverlay.displayName = 'LoadingOverlay';
LoadingContent.displayName = 'LoadingContent';
