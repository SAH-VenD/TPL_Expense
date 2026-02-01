import React from 'react';
import clsx from 'clsx';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  hover,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'card',
        paddingStyles[padding],
        hover && 'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}> = ({ children, className, action }) => (
  <div className={clsx('flex items-center justify-between mb-4', className)}>
    <div>{children}</div>
    {action && <div>{action}</div>}
  </div>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3 className={clsx('text-lg font-semibold text-gray-900', className)}>{children}</h3>
);

export const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={clsx('text-sm text-gray-500 mt-1', className)}>{children}</p>
);

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => <div className={className}>{children}</div>;

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={clsx('mt-4 pt-4 border-t border-gray-200', className)}>{children}</div>
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
