import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Badge, Pagination, EmptyState, Alert, PageHeader } from '@/components/ui';
import { ViewToggle, type ViewType } from '@/components/expenses/ViewToggle';
import { VoucherTable } from '@/components/vouchers/VoucherTable';
import { useAppSelector } from '@/store/hooks';
import { useGetVouchersQuery } from '@/features/vouchers/services/vouchers.service';
import { VoucherCard, VoucherCardSkeleton } from '@/features/vouchers/components/VoucherCard';
import { VoucherFilters, type VoucherFilterOptions } from '@/features/vouchers/components/VoucherFilters';
import type { VoucherStatus } from '@/features/vouchers/types/vouchers.types';
import { VOUCHER_STATUS_CONFIG, VOUCHER_ROUTES } from '@/features/vouchers/types/vouchers.types';

// Local storage key for voucher view preference
const VOUCHERS_VIEW_KEY = 'vouchers_view';

// Hook for voucher view preference with localStorage persistence
const useVoucherViewPreference = (defaultView: ViewType = 'grid'): [ViewType, (view: ViewType) => void] => {
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VOUCHERS_VIEW_KEY);
      if (stored === 'list' || stored === 'grid') {
        return stored;
      }
    }
    return defaultView;
  });

  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOUCHERS_VIEW_KEY, newView);
    }
  }, []);

  return [view, handleViewChange];
};

interface TabConfig {
  id: VoucherStatus | 'ALL';
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'ALL', label: 'All', icon: <DocumentCheckIcon className="h-4 w-4" /> },
  { id: 'REQUESTED', label: 'Pending', icon: <ClockIcon className="h-4 w-4" /> },
  { id: 'APPROVED', label: 'Approved', icon: <CheckCircleIcon className="h-4 w-4" /> },
  { id: 'DISBURSED', label: 'Disbursed', icon: <BanknotesIcon className="h-4 w-4" /> },
  { id: 'PARTIALLY_SETTLED', label: 'Partial', icon: <DocumentCheckIcon className="h-4 w-4" /> },
  { id: 'SETTLED', label: 'Settled', icon: <CheckCircleIcon className="h-4 w-4" /> },
  { id: 'OVERDUE', label: 'Overdue', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  { id: 'REJECTED', label: 'Rejected', icon: <XCircleIcon className="h-4 w-4" /> },
];

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function VoucherListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);

  // Read state from URL params
  const initialStatus = (searchParams.get('status') as VoucherStatus | 'ALL') || 'ALL';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(
    searchParams.get('pageSize') || DEFAULT_PAGE_SIZE.toString(),
    10
  );

  const [selectedStatus, setSelectedStatus] = useState<VoucherStatus | 'ALL'>(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<VoucherFilterOptions>({});
  const [view, setView] = useVoucherViewPreference('grid');

  // Build query params
  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      ...(selectedStatus !== 'ALL' && { status: selectedStatus }),
      ...filters,
    }),
    [page, pageSize, selectedStatus, filters]
  );

  // Fetch vouchers
  const {
    data: vouchersResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetVouchersQuery(queryParams);

  const vouchers = vouchersResponse?.data || [];
  const pagination = vouchersResponse?.meta?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || 0;
  const statusCounts: Record<string, number> = vouchersResponse?.statusCounts || {};

  // Calculate total count for "ALL" tab from all individual status counts
  const totalStatusCount = useMemo(() => {
    return Object.values(statusCounts).reduce((sum: number, count: number) => sum + (count || 0), 0);
  }, [statusCounts]);

  // Get count for a specific status tab
  const getStatusCount = (tabId: VoucherStatus | 'ALL'): number => {
    if (tabId === 'ALL') {
      return totalStatusCount;
    }
    return statusCounts[tabId] || 0;
  };

  // Update URL when state changes
  const updateUrlParams = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params, { replace: true });
  };

  const handleTabChange = (status: VoucherStatus | 'ALL') => {
    setSelectedStatus(status);
    setPage(1);
    updateUrlParams({
      status: status !== 'ALL' ? status : undefined,
      page: '1',
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage.toString() });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value, 10);
    setPageSize(newPageSize);
    setPage(1);
    updateUrlParams({ pageSize: newPageSize.toString(), page: '1' });
  };

  const handleFiltersApply = (newFilters: VoucherFilterOptions) => {
    setFilters(newFilters);
    setPage(1);
    if (newFilters.status) {
      setSelectedStatus(newFilters.status);
    }
    updateUrlParams({ page: '1' });
  };

  const handleFiltersReset = () => {
    setFilters({});
    setPage(1);
    updateUrlParams({ page: '1' });
  };

  const handleVoucherClick = (id: string) => {
    navigate(VOUCHER_ROUTES.DETAIL(id));
  };

  const handleRequestVoucher = () => {
    navigate(VOUCHER_ROUTES.REQUEST);
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Petty Cash Vouchers"
          subtitle="Manage petty cash requests and settlements"
          breadcrumbs={[{ label: 'Vouchers' }]}
        />
        <Alert variant="error" title="Error loading vouchers">
          <p>Failed to load vouchers. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Petty Cash Vouchers"
        subtitle="Manage petty cash requests and settlements"
        breadcrumbs={[{ label: 'Vouchers' }]}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <button
              onClick={handleRequestVoucher}
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Request Voucher
            </button>
          </>
        }
      />

      {/* Status Tabs */}
      <div className="card p-2 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max" aria-label="Voucher status tabs">
          {TABS.map((tab) => {
            const isActive = selectedStatus === tab.id;
            const statusConfig =
              tab.id !== 'ALL' ? VOUCHER_STATUS_CONFIG[tab.id] : null;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                <Badge
                  variant={isActive ? 'default' : (statusConfig?.variant || 'default')}
                  size="sm"
                  className="ml-2"
                >
                  {getStatusCount(tab.id)}
                </Badge>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      {user && (
        <VoucherFilters
          onApply={handleFiltersApply}
          onReset={handleFiltersReset}
          defaultFilters={filters}
          userRole={user.role}
          isLoading={isFetching}
        />
      )}

      {/* Page Size Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalItems > 0
            ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(
                page * pageSize,
                totalItems
              )} of ${totalItems} vouchers`
            : 'No vouchers found'}
        </p>
        <div className="flex items-center space-x-2">
          <label htmlFor="pageSize" className="text-sm text-gray-500">
            Show:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Voucher List/Grid */}
      {isLoading ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <VoucherCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <VoucherTable vouchers={[]} isLoading={true} onRowClick={() => {}} />
        )
      ) : vouchers.length === 0 ? (
        <EmptyState
          title="No vouchers found"
          description={
            selectedStatus === 'ALL'
              ? "You haven't created any petty cash vouchers yet."
              : `No vouchers with status "${VOUCHER_STATUS_CONFIG[selectedStatus as VoucherStatus]?.label || selectedStatus}".`
          }
          action={
            <button
              onClick={handleRequestVoucher}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Request Your First Voucher
            </button>
          }
        />
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  onClick={handleVoucherClick}
                />
              ))}
            </div>
          ) : (
            <VoucherTable
              vouchers={vouchers}
              isLoading={false}
              onRowClick={(voucher) => handleVoucherClick(voucher.id)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={totalItems}
              pageSize={pageSize}
              showPageInfo
            />
          )}
        </>
      )}
    </div>
  );
}

export default VoucherListPage;
