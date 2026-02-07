import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { NotificationPanel } from './NotificationPanel';
import { useGetUnreadCountQuery } from '@/features/notifications/services/notifications.service';

export interface NotificationBellProps {
  className?: string;
  position?: 'header' | 'sidebar';
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

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  position = 'header',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // Fetch unread count
  const { data: unreadCountData, isLoading } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = unreadCountData?.count ?? 0;

  // Trigger animation when new notification arrives
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotification(true);
      const timer = setTimeout(() => {
        setHasNewNotification(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  // Handle keyboard shortcut (Cmd/Ctrl + N)
  const handleKeyboardShortcut = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, [handleKeyboardShortcut]);

  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  // Format unread count for display
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={togglePanel}
        className={clsx(
          'relative p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          position === 'header'
            ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            : 'text-gray-600 hover:bg-gray-100',
          isOpen && 'bg-gray-100 text-gray-700',
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      >
        <BellIcon className={clsx('w-6 h-6', hasNewNotification && 'animate-bounce')} />

        {/* Unread count badge */}
        {unreadCount > 0 && !isLoading && (
          <span
            className={clsx(
              'absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full',
              hasNewNotification && 'animate-pulse',
            )}
          >
            {displayCount}
          </span>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        )}
      </button>

      {/* Notification Panel */}
      <NotificationPanel isOpen={isOpen} onClose={closePanel} />
    </div>
  );
};

NotificationBell.displayName = 'NotificationBell';
