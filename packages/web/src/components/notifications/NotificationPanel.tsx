import React, { Fragment, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Transition } from '@headlessui/react';
import { NotificationItem } from './NotificationItem';
import { Spinner } from '@/components/ui/Spinner';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from '@/features/notifications/services/notifications.service';

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  maxNotifications?: number;
  autoClose?: boolean;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  maxNotifications = 10,
  autoClose = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    isFetching,
  } = useGetNotificationsQuery(
    { pageSize: maxNotifications },
    {
      skip: !isOpen,
      pollingInterval: isOpen ? 30000 : 0, // Poll every 30s when open
    }
  );

  // Mutations
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAllRead }] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsData?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await deleteNotification(id).unwrap();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = () => {
    if (autoClose) {
      onClose();
    }
  };

  return (
    <Transition
      show={isOpen}
      as={Fragment}
      enter="transition ease-out duration-200"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-150"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <div
        ref={panelRef}
        className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 flex items-center gap-1"
                title="Mark all as read"
              >
                {isMarkingAllRead ? (
                  <Spinner size="xs" />
                ) : (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    Mark all read
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close notifications"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" label="Loading notifications..." />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="p-3 bg-gray-100 rounded-full mb-3">
                <InboxIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">You're all caught up!</p>
              <p className="text-xs text-gray-500 mt-1">No new notifications</p>
            </div>
          ) : (
            <>
              {isFetching && !isLoading && (
                <div className="flex items-center justify-center py-2 bg-gray-50 border-b border-gray-100">
                  <Spinner size="xs" label="Updating..." />
                </div>
              )}
              <div>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDismiss={handleDismiss}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <Link
              to="/notifications"
              onClick={onClose}
              className="block text-center text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>
    </Transition>
  );
};

NotificationPanel.displayName = 'NotificationPanel';
