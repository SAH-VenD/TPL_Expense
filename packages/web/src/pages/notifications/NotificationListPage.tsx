import React, { useState } from 'react';
import clsx from 'clsx';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
  type NotificationType,
} from '@/features/notifications/services/notifications.service';

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
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

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

const breadcrumbItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Notifications' },
];

type FilterTab = 'all' | 'unread' | 'read';

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

const notificationTypeOptions: { value: NotificationType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'EXPENSE_APPROVED', label: 'Expense Approved' },
  { value: 'EXPENSE_REJECTED', label: 'Expense Rejected' },
  { value: 'APPROVAL_REQUESTED', label: 'Approval Requested' },
  { value: 'COMMENT_ADDED', label: 'Comment Added' },
  { value: 'VOUCHER_APPROVED', label: 'Voucher Approved' },
  { value: 'BUDGET_THRESHOLD_EXCEEDED', label: 'Budget Alert' },
  { value: 'CLARIFICATION_REQUESTED', label: 'Clarification Requested' },
  { value: 'SYSTEM_MESSAGE', label: 'System Message' },
];

export const NotificationListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedType, setSelectedType] = useState<NotificationType | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Build query filters
  const filters = {
    page,
    pageSize,
    ...(activeTab === 'unread' && { isRead: false }),
    ...(activeTab === 'read' && { isRead: true }),
    ...(selectedType && { type: selectedType }),
  };

  // Fetch notifications
  const { data, isLoading, isFetching } = useGetNotificationsQuery(filters);

  // Mutations
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAllRead }] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [clearAll, { isLoading: isClearing }] = useClearAllNotificationsMutation();

  const notifications = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      try {
        await clearAll().unwrap();
      } catch (error) {
        console.error('Failed to clear all notifications:', error);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination ? `${pagination.total} total notifications` : 'Manage your notifications'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isMarkingAllRead ? (
                <Spinner size="xs" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isClearing ? (
                <Spinner size="xs" />
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Tab filters */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {tab.label}
                  {tab.id === 'unread' && unreadCount > 0 && (
                    <Badge variant="danger" size="sm" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <FilterIcon className="w-4 h-4 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value as NotificationType | '');
                  setPage(1);
                }}
                className="block w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {notificationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" label="Loading notifications..." />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <InboxIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900">No notifications</p>
            <p className="text-sm text-gray-500 mt-1 text-center">
              {activeTab === 'unread'
                ? "You're all caught up! No unread notifications."
                : activeTab === 'read'
                ? 'No read notifications to show.'
                : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Loading overlay when fetching */}
            {isFetching && !isLoading && (
              <div className="flex items-center justify-center py-2 bg-gray-50 border-b border-gray-100">
                <Spinner size="xs" label="Updating..." />
              </div>
            )}

            {/* Notification items */}
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-4 border-t border-gray-100">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalItems={pagination.total}
                  pageSize={pagination.pageSize}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

NotificationListPage.displayName = 'NotificationListPage';
