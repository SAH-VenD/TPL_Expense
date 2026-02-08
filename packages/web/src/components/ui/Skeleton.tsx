import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={clsx('bg-gray-200', variantStyles[variant], animationStyles[animation], className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

// Preset skeleton components
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={clsx('space-y-2', className)}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton key={i} variant="text" height={16} width={i === lines - 1 ? '75%' : '100%'} />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => <Skeleton variant="circular" width={size} height={size} className={className} />;

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('card p-6 space-y-4', className)} aria-busy="true">
    <div className="flex items-center space-x-4">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="40%" />
        <Skeleton height={12} width="60%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className,
}) => (
  <div className={clsx('card overflow-hidden', className)} aria-busy="true">
    <div className="animate-pulse">
      <div className="h-12 bg-gray-100 flex items-center px-6 space-x-6">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} height={12} width={80} />
        ))}
      </div>
      {[...Array(rows)].map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="h-16 border-t border-gray-200 flex items-center px-6 space-x-6"
        >
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} height={12} width={colIndex === 0 ? 120 : 80} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

Skeleton.displayName = 'Skeleton';
SkeletonText.displayName = 'SkeletonText';
SkeletonAvatar.displayName = 'SkeletonAvatar';
SkeletonCard.displayName = 'SkeletonCard';
SkeletonTable.displayName = 'SkeletonTable';
