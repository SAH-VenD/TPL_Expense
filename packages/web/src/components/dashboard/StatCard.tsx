import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { Card, Skeleton } from '@/components/ui';

export interface StatCardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percentage';
  currency?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'compact' | 'expanded';
  loading?: boolean;
  className?: string;
}

const formatValue = (
  value: number | string,
  format: 'number' | 'currency' | 'percentage',
  currency: string
): string => {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-PK').format(value);
  }
};

const TrendIndicator: React.FC<{
  trend?: 'up' | 'down' | 'stable';
  changePercentage?: number;
  format?: 'number' | 'currency' | 'percentage';
}> = ({ trend, changePercentage }) => {
  if (!trend || trend === 'stable') {
    return changePercentage !== undefined ? (
      <div className="flex items-center text-gray-500">
        <MinusIcon className="h-4 w-4 mr-1" />
        <span className="text-xs font-medium">0%</span>
      </div>
    ) : null;
  }

  const isUp = trend === 'up';
  const Icon = isUp ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div
      className={clsx(
        'flex items-center',
        isUp ? 'text-green-600' : 'text-red-600'
      )}
    >
      <Icon className="h-4 w-4 mr-1" />
      {changePercentage !== undefined && (
        <span className="text-xs font-medium">
          {Math.abs(changePercentage).toFixed(1)}%
        </span>
      )}
    </div>
  );
};

const StatCardSkeleton: React.FC<{ variant: 'compact' | 'expanded' }> = ({ variant }) => (
  <Card padding={variant === 'compact' ? 'sm' : 'md'}>
    <div className="space-y-3">
      {variant === 'expanded' && (
        <div className="flex items-center justify-between">
          <Skeleton width={40} height={40} variant="circular" />
          <Skeleton width={60} height={20} />
        </div>
      )}
      <div>
        <Skeleton width="60%" height={variant === 'compact' ? 28 : 36} className="mb-2" />
        <Skeleton width="80%" height={14} />
      </div>
      {variant === 'compact' && (
        <Skeleton width={60} height={16} />
      )}
    </div>
  </Card>
);

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  previousValue,
  changePercentage,
  trend,
  format = 'number',
  currency = 'PKR',
  subtitle,
  icon,
  onClick,
  href,
  variant = 'compact',
  loading = false,
  className,
}) => {
  if (loading) {
    return <StatCardSkeleton variant={variant} />;
  }

  const formattedValue = formatValue(value, format, currency);

  const content = (
    <Card
      padding={variant === 'compact' ? 'sm' : 'md'}
      hover={!!onClick || !!href}
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden',
        (onClick || href) && 'cursor-pointer',
        className
      )}
    >
      {variant === 'expanded' && (
        <div className="flex items-center justify-between mb-4">
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600">
              {icon}
            </div>
          )}
          <TrendIndicator
            trend={trend}
            changePercentage={changePercentage}
          />
        </div>
      )}

      <div>
        <p
          className={clsx(
            'font-bold text-gray-900',
            variant === 'compact' ? 'text-2xl' : 'text-3xl'
          )}
        >
          {formattedValue}
        </p>
        <p
          className={clsx(
            'font-medium text-gray-600 mt-1',
            variant === 'compact' ? 'text-sm' : 'text-base'
          )}
        >
          {label}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>

      {variant === 'compact' && (trend || changePercentage !== undefined) && (
        <div className="mt-3">
          <TrendIndicator
            trend={trend}
            changePercentage={changePercentage}
          />
        </div>
      )}

      {previousValue !== undefined && (
        <p className="text-xs text-gray-400 mt-2">
          Previous: {formatValue(previousValue, format, currency)}
        </p>
      )}
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
};

StatCard.displayName = 'StatCard';
