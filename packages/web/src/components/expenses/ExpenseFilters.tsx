import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { subDays, startOfMonth, endOfMonth, startOfYear, format } from 'date-fns';
import clsx from 'clsx';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { Badge } from '../ui/Badge';
import { useGetCategoriesQuery } from '@/features/admin/services/admin.service';
import type {
  ExpenseStatus,
  ExpenseFilters as ExpenseFiltersType,
} from '@/features/expenses/services/expenses.service';

export interface ExpenseFiltersProps {
  onFiltersChange: (filters: ExpenseFiltersType) => void;
  loading?: boolean;
  className?: string;
}

interface DatePreset {
  label: string;
  value: string;
  getDateRange: () => { from: string; to: string };
}

const datePresets: DatePreset[] = [
  {
    label: 'Last 7 days',
    value: 'last7days',
    getDateRange: () => ({
      from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Last 30 days',
    value: 'last30days',
    getDateRange: () => ({
      from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'This month',
    value: 'thisMonth',
    getDateRange: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'This year',
    value: 'thisYear',
    getDateRange: () => ({
      from: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
];

const statusOptions: { value: ExpenseStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLARIFICATION_REQUESTED', label: 'Clarification Requested' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'PAID', label: 'Paid' },
];

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'createdAt:asc', label: 'Oldest First' },
  { value: 'amount:desc', label: 'Highest Amount' },
  { value: 'amount:asc', label: 'Lowest Amount' },
  { value: 'expenseDate:desc', label: 'Recent Date' },
  { value: 'expenseDate:asc', label: 'Oldest Date' },
];

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  onFiltersChange,
  loading,
  className,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Get categories from API
  const { data: categories } = useGetCategoriesQuery();

  // Parse filters from URL
  const getFiltersFromUrl = React.useCallback((): ExpenseFiltersType => {
    const statusParam = searchParams.get('status');
    return {
      search: searchParams.get('search') || undefined,
      status: statusParam ? (statusParam.split(',') as ExpenseStatus[]) : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      amountMin: searchParams.get('amountMin') ? Number(searchParams.get('amountMin')) : undefined,
      amountMax: searchParams.get('amountMax') ? Number(searchParams.get('amountMax')) : undefined,
      sort: (searchParams.get('sort') as ExpenseFiltersType['sort']) || undefined,
    };
  }, [searchParams]);

  const [filters, setFilters] = React.useState<ExpenseFiltersType>(getFiltersFromUrl);

  // Update URL when filters change
  const updateUrl = React.useCallback(
    (newFilters: ExpenseFiltersType) => {
      const params = new URLSearchParams();
      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.status?.length) params.set('status', newFilters.status.join(','));
      if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
      if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);
      if (newFilters.categoryId) params.set('categoryId', newFilters.categoryId);
      if (newFilters.amountMin !== undefined) params.set('amountMin', String(newFilters.amountMin));
      if (newFilters.amountMax !== undefined) params.set('amountMax', String(newFilters.amountMax));
      if (newFilters.sort) params.set('sort', newFilters.sort);
      setSearchParams(params);
    },
    [setSearchParams],
  );

  // Update filters and notify parent
  const handleFilterChange = React.useCallback(
    (key: keyof ExpenseFiltersType, value: unknown) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      updateUrl(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, updateUrl, onFiltersChange],
  );

  // Clear all filters
  const handleClearAll = React.useCallback(() => {
    const emptyFilters: ExpenseFiltersType = {};
    setFilters(emptyFilters);
    setSearchParams(new URLSearchParams());
    onFiltersChange(emptyFilters);
  }, [setSearchParams, onFiltersChange]);

  // Handle status toggle
  const handleStatusToggle = (status: ExpenseStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    handleFilterChange('status', newStatuses.length > 0 ? newStatuses : undefined);
  };

  // Handle date preset
  const handleDatePreset = (preset: DatePreset) => {
    const { from, to } = preset.getDateRange();
    const newFilters = { ...filters, dateFrom: from, dateTo: to };
    setFilters(newFilters);
    updateUrl(newFilters);
    onFiltersChange(newFilters);
  };

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status?.length) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.categoryId) count++;
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) count++;
    return count;
  }, [filters]);

  // Category options
  const categoryOptions = React.useMemo(() => {
    if (!categories) return [];
    return categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
    }));
  }, [categories]);

  return (
    <div className={clsx('bg-white rounded-lg shadow', className)}>
      {/* Search and Toggle Row */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search expenses..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              disabled={loading}
              leftIcon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
                isExpanded
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50',
              )}
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="primary" size="sm">
                  {activeFilterCount}
                </Badge>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-b border-gray-200">
          {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusToggle(option.value)}
                  disabled={loading}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-full border transition-colors',
                    filters.status?.includes(option.value)
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {datePresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleDatePreset(preset)}
                  disabled={loading}
                  className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker
                label="From"
                value={filters.dateFrom}
                onChange={(date) => handleFilterChange('dateFrom', date || undefined)}
                disabled={loading}
              />
              <DatePicker
                label="To"
                value={filters.dateTo}
                onChange={(date) => handleFilterChange('dateTo', date || undefined)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Category and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Category"
              options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
              value={filters.categoryId || ''}
              onChange={(value) => handleFilterChange('categoryId', value || undefined)}
              disabled={loading}
            />
            <Input
              label="Min Amount"
              type="number"
              value={filters.amountMin?.toString() || ''}
              onChange={(e) =>
                handleFilterChange('amountMin', e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={loading}
              min={0}
            />
            <Input
              label="Max Amount"
              type="number"
              value={filters.amountMax?.toString() || ''}
              onChange={(e) =>
                handleFilterChange('amountMax', e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={loading}
              min={0}
            />
          </div>

          {/* Sort */}
          <div className="w-full sm:w-64">
            <Select
              label="Sort By"
              options={sortOptions}
              value={filters.sort || 'createdAt:desc'}
              onChange={(value) => handleFilterChange('sort', value as ExpenseFiltersType['sort'])}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Active Filters Tags */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
              Search: {filters.search}
              <button
                type="button"
                onClick={() => handleFilterChange('search', undefined)}
                className="hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.status?.map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full"
            >
              {statusOptions.find((s) => s.value === status)?.label}
              <button
                type="button"
                onClick={() => handleStatusToggle(status)}
                className="hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
              Date: {filters.dateFrom || '...'} - {filters.dateTo || '...'}
              <button
                type="button"
                onClick={() => {
                  handleFilterChange('dateFrom', undefined);
                  handleFilterChange('dateTo', undefined);
                }}
                className="hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.categoryId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
              Category: {categoryOptions.find((c) => c.value === filters.categoryId)?.label}
              <button
                type="button"
                onClick={() => handleFilterChange('categoryId', undefined)}
                className="hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

ExpenseFilters.displayName = 'ExpenseFilters';
