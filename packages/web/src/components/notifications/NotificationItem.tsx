import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type {
  Notification,
  NotificationType,
} from '@/features/notifications/services/notifications.service';
import { formatNotificationTime } from '@/features/notifications/services/notifications.service';

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: () => void;
  isLoading?: boolean;
}

// Icon components for different notification types
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Icon mapping for notification types
const getNotificationTypeIcon = (type: NotificationType): React.FC<{ className?: string }> => {
  const iconMap: Record<NotificationType, React.FC<{ className?: string }>> = {
    EXPENSE_APPROVED: CheckCircleIcon,
    EXPENSE_REJECTED: XCircleIcon,
    EXPENSE_PENDING_APPROVAL: ClockIcon,
    APPROVAL_REQUESTED: UsersIcon,
    COMMENT_ADDED: MessageSquareIcon,
    VOUCHER_APPROVED: CheckCircleIcon,
    VOUCHER_DISBURSED: CreditCardIcon,
    BUDGET_THRESHOLD_EXCEEDED: AlertTriangleIcon,
    CLARIFICATION_REQUESTED: HelpCircleIcon,
    SYSTEM_MESSAGE: InfoIcon,
    DELEGATION_STARTED: UsersIcon,
    DELEGATION_ENDED: UsersIcon,
  };
  return iconMap[type] || BellIcon;
};

// Icon color mapping for notification types
const getIconColor = (type: NotificationType): string => {
  const colorMap: Record<NotificationType, string> = {
    EXPENSE_APPROVED: 'text-green-500 bg-green-100',
    EXPENSE_REJECTED: 'text-red-500 bg-red-100',
    EXPENSE_PENDING_APPROVAL: 'text-yellow-500 bg-yellow-100',
    APPROVAL_REQUESTED: 'text-blue-500 bg-blue-100',
    COMMENT_ADDED: 'text-purple-500 bg-purple-100',
    VOUCHER_APPROVED: 'text-green-500 bg-green-100',
    VOUCHER_DISBURSED: 'text-blue-500 bg-blue-100',
    BUDGET_THRESHOLD_EXCEEDED: 'text-orange-500 bg-orange-100',
    CLARIFICATION_REQUESTED: 'text-yellow-500 bg-yellow-100',
    SYSTEM_MESSAGE: 'text-gray-500 bg-gray-100',
    DELEGATION_STARTED: 'text-blue-500 bg-blue-100',
    DELEGATION_ENDED: 'text-gray-500 bg-gray-100',
  };
  return colorMap[type] || 'text-gray-500 bg-gray-100';
};

// Get link for notification based on related entity
const getNotificationLink = (notification: Notification): string | undefined => {
  if (notification.action?.href) {
    return notification.action.href;
  }

  if (notification.relatedEntity) {
    const { type, id } = notification.relatedEntity;
    switch (type) {
      case 'EXPENSE':
        return `/expenses/${id}`;
      case 'APPROVAL':
        return `/approvals`;
      case 'VOUCHER':
        return `/vouchers/${id}`;
      case 'BUDGET':
        return `/admin/budgets`;
      default:
        return undefined;
    }
  }

  return undefined;
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDismiss,
  onClick,
  isLoading = false,
}) => {
  const Icon = getNotificationTypeIcon(notification.type);
  const iconColorClasses = getIconColor(notification.type);
  const link = getNotificationLink(notification);
  const timeAgo = formatNotificationTime(notification.createdAt);

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDismiss?.(notification.id);
  };

  const content = (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 transition-colors',
        !notification.isRead && 'bg-blue-50/50',
        'hover:bg-gray-50',
        isLoading && 'opacity-50 pointer-events-none',
      )}
    >
      {/* Icon */}
      <div className={clsx('flex-shrink-0 p-2 rounded-full', iconColorClasses)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={clsx(
                'text-sm line-clamp-1',
                !notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
              )}
            >
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{notification.message}</p>

            {/* Metadata */}
            {notification.metadata?.expenseAmount && (
              <p className="text-xs text-gray-500 mt-1">
                Amount: {notification.metadata.expenseCurrency || 'PKR'}{' '}
                {notification.metadata.expenseAmount.toLocaleString()}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
          </div>

          {/* Unread indicator and dismiss button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.isRead && (
              <span
                className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                aria-label="Unread notification"
              />
            )}
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Dismiss notification"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action button */}
        {notification.action && (
          <div className="mt-2">
            <span className="text-xs font-medium text-primary-600 hover:text-primary-700">
              {notification.action.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link
        to={link}
        onClick={handleClick}
        className="block border-b border-gray-100 last:border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="border-b border-gray-100 last:border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {content}
    </div>
  );
};

NotificationItem.displayName = 'NotificationItem';
