import React from 'react';
import { format } from 'date-fns';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { Skeleton } from '../ui/Skeleton';
import type { ApprovalHistory } from '@/features/expenses/services/expenses.service';

export interface ApprovalTimelineProps {
  approvals?: ApprovalHistory[];
  loading?: boolean;
  onReload?: () => void;
  className?: string;
}

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';

const statusConfig: Record<
  ApprovalStatus,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  PENDING: {
    icon: <ClockIcon className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Pending',
  },
  APPROVED: {
    icon: <CheckCircleIcon className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Approved',
  },
  REJECTED: {
    icon: <XCircleIcon className="h-5 w-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Rejected',
  },
  CLARIFICATION_REQUESTED: {
    icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Clarification Requested',
  },
};

const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM d, yyyy \'at\' h:mm a');
  } catch {
    return dateString;
  }
};

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  approvals,
  loading,
  onReload,
  className,
}) => {
  if (loading) {
    return (
      <div className={clsx('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton height={16} width="60%" />
              <Skeleton height={12} width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className={clsx('text-center py-8', className)}>
        <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No approval history yet</p>
        <p className="text-xs text-gray-400">
          Approval history will appear once the expense is submitted
        </p>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="mt-4 text-sm text-primary-600 hover:text-primary-700"
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  // Sort approvals by tier level
  const sortedApprovals = [...approvals].sort((a, b) => a.tierLevel - b.tierLevel);

  // Default config for unknown/missing actions
  const defaultConfig = {
    icon: <ClockIcon className="h-5 w-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Unknown',
  };

  return (
    <div className={className}>
      <div className="flow-root">
        <ul className="-mb-8">
          {sortedApprovals.map((approval, index) => {
            const config = statusConfig[approval.action as ApprovalStatus] || defaultConfig;
            const isLast = index === sortedApprovals.length - 1;

            return (
              <li key={approval.id}>
                <div className="relative pb-8">
                  {/* Connector line */}
                  {!isLast && (
                    <span
                      className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative flex items-start space-x-3">
                    {/* Icon */}
                    <div
                      className={clsx(
                        'relative flex h-10 w-10 items-center justify-center rounded-full',
                        config.bgColor,
                        config.color
                      )}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Tier {approval.tierLevel}</span>
                        <span
                          className={clsx(
                            'ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            config.bgColor,
                            config.color
                          )}
                        >
                          {config.label}
                        </span>
                        {approval.wasEscalated && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            Escalated
                          </span>
                        )}
                        {approval.delegatedFromId && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Delegated
                          </span>
                        )}
                      </div>

                      {/* Approver info */}
                      <div className="mt-1 text-sm text-gray-500">
                        {approval.approver ? (
                          <span>
                            {approval.action === 'APPROVED' ? 'Approved' :
                             approval.action === 'REJECTED' ? 'Rejected' : 'Reviewed'} by{' '}
                            <span className="font-medium text-gray-700">
                              {approval.approver.firstName} {approval.approver.lastName}
                            </span>
                            {approval.approver.email && (
                              <span className="text-gray-400"> ({approval.approver.email})</span>
                            )}
                          </span>
                        ) : (
                          <span>Unknown approver</span>
                        )}
                      </div>

                      {/* Date */}
                      {approval.createdAt && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {formatDateTime(approval.createdAt)}
                        </p>
                      )}

                      {/* Comment */}
                      {approval.comment && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <span className={clsx(
                              'font-medium',
                              approval.action === 'REJECTED' ? 'text-red-700' :
                              approval.action === 'CLARIFICATION_REQUESTED' ? 'text-amber-700' :
                              'text-gray-700'
                            )}>
                              {approval.action === 'REJECTED' ? 'Rejection Reason:' :
                               approval.action === 'CLARIFICATION_REQUESTED' ? 'Clarification Request:' :
                               'Comment:'}
                            </span>
                            <p className="text-gray-600 mt-1">{approval.comment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

ApprovalTimeline.displayName = 'ApprovalTimeline';
