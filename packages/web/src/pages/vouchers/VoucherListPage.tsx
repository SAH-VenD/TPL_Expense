import React, { useState, useMemo } from 'react';
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
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useAppSelector } from '@/store/hooks';
import { useGetVouchersQuery } from '@/features/vouchers/services/vouchers.service';
import { VoucherCard, VoucherCardSkeleton } from '@/features/vouchers/components/VoucherCard';
import { VoucherFilters, type VoucherFilterOptions } from '@/features/vouchers/components/VoucherFilters';
import type { VoucherStatus } from '@/features/vouchers/types/vouchers.types';
import { VOUCHER_STATUS_CONFIG, VOUCHER_ROUTES } from '@/features/vouchers/types/vouchers.types';

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

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Petty Cash Vouchers' },
  ];

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} className="mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Petty Cash Vouchers</h1>
        </div>
        <button
          onClick={handleRequestVoucher}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Request Voucher
        </button>
      </div>

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
                {statusConfig && (
                  <Badge
                    variant={isActive ? 'default' : statusConfig.variant}
                    size="sm"
                    className="ml-2"
                  >
                    {/* Count would come from API statusCounts */}
                    {vouchers.filter((v) => v.status === tab.id).length}
                  </Badge>
                )}
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

      {/* Voucher Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <VoucherCardSkeleton key={i} />
          ))}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                onClick={handleVoucherClick}
              />
            ))}
          </div>

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
