import React from 'react';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Voucher, VoucherUrgency } from '../types/vouchers.types';
import {
  VOUCHER_STATUS_CONFIG,
  formatAmount,
  formatDate,
  getVoucherUrgency,
  getDaysUntilDeadline,
} from '../types/vouchers.types';

export interface VoucherCardProps {
  voucher: Voucher;
  onClick?: (id: string) => void;
  isLoading?: boolean;
}

const urgencyStyles: Record<VoucherUrgency, string> = {
  overdue: 'border-l-4 border-l-red-500 bg-red-50',
  'due-soon': 'border-l-4 border-l-yellow-500 bg-yellow-50',
  normal: '',
};

export const VoucherCard: React.FC<VoucherCardProps> = ({ voucher, onClick, isLoading }) => {
  if (isLoading) {
    return <VoucherCardSkeleton />;
  }

  const statusConfig = VOUCHER_STATUS_CONFIG[voucher.status];
  const urgency = getVoucherUrgency(voucher.status, voucher.settlementDeadline);
  const daysUntil = voucher.settlementDeadline
    ? getDaysUntilDeadline(voucher.settlementDeadline)
    : null;

  const truncatedPurpose =
    voucher.purpose.length > 60 ? `${voucher.purpose.substring(0, 60)}...` : voucher.purpose;

  const handleClick = () => {
    if (onClick) {
      onClick(voucher.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick(voucher.id);
    }
  };

  // Calculate balance if applicable
  const showBalance =
    voucher.disbursedAmount !== undefined &&
    voucher.settledAmount !== undefined &&
    ['PARTIALLY_SETTLED', 'SETTLED'].includes(voucher.status);
  const balance = showBalance
    ? (voucher.disbursedAmount || 0) - (voucher.settledAmount || 0)
    : null;

  return (
    <Card
      className={clsx(
        'transition-all duration-200',
        urgencyStyles[urgency],
        onClick && 'hover:shadow-md cursor-pointer',
      )}
      padding="md"
      onClick={onClick ? handleClick : undefined}
      hover={!!onClick}
    >
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        aria-label={`Voucher ${voucher.voucherNumber}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-primary-600 hover:text-primary-700">
              {voucher.voucherNumber}
            </h3>
            <p className="text-sm text-gray-500 mt-1" title={voucher.purpose}>
              {truncatedPurpose}
            </p>
          </div>
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Amount Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Requested:</span>
            <span className="font-medium text-gray-900">
              {formatAmount(voucher.requestedAmount, voucher.currency)}
            </span>
          </div>

          {voucher.disbursedAmount !== undefined && voucher.disbursedAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Disbursed:</span>
              <span className="font-medium text-gray-900">
                {formatAmount(voucher.disbursedAmount, voucher.currency)}
              </span>
            </div>
          )}

          {voucher.settledAmount !== undefined && voucher.settledAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Expenses:</span>
              <span className="font-medium text-gray-900">
                {formatAmount(voucher.settledAmount, voucher.currency)}
              </span>
            </div>
          )}

          {showBalance && balance !== null && (
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-gray-500">{balance >= 0 ? 'Balance:' : 'Overspent:'}</span>
              <span
                className={clsx('font-medium', balance >= 0 ? 'text-green-600' : 'text-red-600')}
              >
                {formatAmount(Math.abs(balance), voucher.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Deadline */}
        {voucher.settlementDeadline && (
          <div
            className={clsx(
              'mt-3 pt-3 border-t border-gray-100 flex items-center text-sm',
              urgency === 'overdue' && 'text-red-600',
              urgency === 'due-soon' && 'text-yellow-600',
              urgency === 'normal' && 'text-gray-500',
            )}
          >
            {urgency === 'overdue' ? (
              <ExclamationTriangleIcon className="h-4 w-4 mr-1.5" />
            ) : (
              <ClockIcon className="h-4 w-4 mr-1.5" />
            )}
            <span>
              {urgency === 'overdue' && 'Overdue - '}
              {urgency === 'due-soon' &&
                daysUntil !== null &&
                `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} - `}
              Due: {formatDate(voucher.settlementDeadline)}
            </span>
          </div>
        )}

        {/* Requester */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Requested by:{' '}
            <span className="font-medium text-gray-700">
              {voucher.requester.firstName} {voucher.requester.lastName}
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
};

export const VoucherCardSkeleton: React.FC = () => {
  return (
    <Card padding="md">
      <div className="animate-pulse">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-2">
            <Skeleton width={120} height={20} />
            <Skeleton width={180} height={16} />
          </div>
          <Skeleton width={80} height={24} variant="rectangular" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton width={70} height={16} />
            <Skeleton width={100} height={16} />
          </div>
          <div className="flex justify-between">
            <Skeleton width={70} height={16} />
            <Skeleton width={100} height={16} />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <Skeleton width={150} height={16} />
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <Skeleton width={180} height={16} />
        </div>
      </div>
    </Card>
  );
};

VoucherCard.displayName = 'VoucherCard';
VoucherCardSkeleton.displayName = 'VoucherCardSkeleton';
