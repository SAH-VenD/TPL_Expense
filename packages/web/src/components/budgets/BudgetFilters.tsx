import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import type { BudgetType, BudgetPeriod } from '@/features/budgets/services/budgets.service';

export interface BudgetFiltersProps {
  type?: BudgetType;
  period?: BudgetPeriod;
  status?: 'active' | 'exhausted';
  searchQuery?: string;
  onTypeChange: (type?: BudgetType) => void;
  onPeriodChange: (period?: BudgetPeriod) => void;
  onStatusChange: (status?: 'active' | 'exhausted') => void;
  onSearchChange: (query?: string) => void;
  onClearAll: () => void;
  className?: string;
}

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'COST_CENTER', label: 'Cost Center' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'CATEGORY', label: 'Category' },
];

const periodOptions = [
  { value: '', label: 'All Periods' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'PROJECT_BASED', label: 'Project Based' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active (Under Budget)' },
  { value: 'exhausted', label: 'Exhausted (Over Budget)' },
];

export const BudgetFilters: React.FC<BudgetFiltersProps> = ({
  type,
  period,
  status,
  searchQuery,
  onTypeChange,
  onPeriodChange,
  onStatusChange,
  onSearchChange,
  onClearAll,
  className,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync external searchQuery with local state
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  const hasFilters = type || period || status || searchQuery;

  const handleClearAll = useCallback(() => {
    setLocalSearch('');
    onClearAll();
  }, [onClearAll]);

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search budgets..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            rightIcon={
              localSearch ? (
                <button
                  onClick={() => setLocalSearch('')}
                  className="pointer-events-auto cursor-pointer hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Type Filter */}
        <div className="w-full sm:w-40">
          <Select
            options={typeOptions}
            value={type || ''}
            onChange={(value) => onTypeChange(value as BudgetType || undefined)}
            placeholder="All Types"
          />
        </div>

        {/* Period Filter */}
        <div className="w-full sm:w-40">
          <Select
            options={periodOptions}
            value={period || ''}
            onChange={(value) => onPeriodChange(value as BudgetPeriod || undefined)}
            placeholder="All Periods"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select
            options={statusOptions}
            value={status || ''}
            onChange={(value) =>
              onStatusChange(value as 'active' | 'exhausted' || undefined)
            }
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasFilters && (
        <div className="flex justify-end">
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <XMarkIcon className="h-4 w-4" />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

BudgetFilters.displayName = 'BudgetFilters';
