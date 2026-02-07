import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import type { RoleType } from '@/features/auth/types/auth.types';
import type { VoucherStatus } from '../types/vouchers.types';
import { MAX_PETTY_CASH_AMOUNT } from '../types/vouchers.types';

export interface VoucherFilterOptions {
  status?: VoucherStatus;
  startDate?: string;
  endDate?: string;
  requesterId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface VoucherFiltersProps {
  onApply: (filters: VoucherFilterOptions) => void;
  onReset: () => void;
  defaultFilters?: VoucherFilterOptions;
  userRole: RoleType;
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'REQUESTED', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DISBURSED', label: 'Disbursed' },
  { value: 'PARTIALLY_SETTLED', label: 'Partially Settled' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'OVERDUE', label: 'Overdue' },
];

export const VoucherFilters: React.FC<VoucherFiltersProps> = ({
  onApply,
  onReset,
  defaultFilters = {},
  userRole,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<VoucherFilterOptions>(defaultFilters);

  const canSeeAdvancedFilters = ['FINANCE', 'ADMIN'].includes(userRole);

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value ? (value as VoucherStatus) : undefined,
    }));
  };

  const handleStartDateChange = (value: string) => {
    setFilters((prev) => ({ ...prev, startDate: value || undefined }));
  };

  const handleEndDateChange = (value: string) => {
    setFilters((prev) => ({ ...prev, endDate: value || undefined }));
  };

  const handleMinAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setFilters((prev) => ({ ...prev, minAmount: value }));
  };

  const handleMaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setFilters((prev) => ({ ...prev, maxAmount: value }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '',
  );

  return (
    <div className="card">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="voucher-filters-panel"
      >
        <div className="flex items-center">
          <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="font-medium text-gray-700">Filters</span>
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Active
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Filter Panel */}
      <div
        id="voucher-filters-panel"
        className={clsx(
          'border-t border-gray-200 overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={filters.status || ''}
              onChange={handleStatusChange}
              placeholder="All Statuses"
            />

            {/* Date Range */}
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={handleStartDateChange}
              maxDate={filters.endDate}
            />
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={handleEndDateChange}
              minDate={filters.startDate}
            />

            {/* Spacer for alignment */}
            <div className="hidden lg:block" />
          </div>

          {/* Advanced Filters - Finance/Admin Only */}
          {canSeeAdvancedFilters && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Amount Range */}
                <Input
                  label="Min Amount (PKR)"
                  type="number"
                  min={0}
                  max={MAX_PETTY_CASH_AMOUNT}
                  value={filters.minAmount?.toString() || ''}
                  onChange={handleMinAmountChange}
                  placeholder="0"
                />
                <Input
                  label="Max Amount (PKR)"
                  type="number"
                  min={0}
                  max={MAX_PETTY_CASH_AMOUNT}
                  value={filters.maxAmount?.toString() || ''}
                  onChange={handleMaxAmountChange}
                  placeholder={MAX_PETTY_CASH_AMOUNT.toString()}
                />

                {/* Amount Range Display */}
                {(filters.minAmount !== undefined || filters.maxAmount !== undefined) && (
                  <div className="lg:col-span-2 flex items-end">
                    <p className="text-sm text-gray-500">
                      Amount range: PKR {filters.minAmount?.toLocaleString() || '0'} - PKR{' '}
                      {filters.maxAmount?.toLocaleString() ||
                        MAX_PETTY_CASH_AMOUNT.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading || !hasActiveFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

VoucherFilters.displayName = 'VoucherFilters';
