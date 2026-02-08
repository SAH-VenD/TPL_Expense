import React from 'react';
import clsx from 'clsx';
import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  stickyHeader?: boolean;
  sortConfig?: SortConfig;
  onSort?: (key: string, direction: SortDirection) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data found',
  loading,
  className,
  stickyHeader,
  sortConfig,
  onSort,
}: DataTableProps<T>) {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    const key = column.key;
    const direction: SortDirection =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSort(key, direction);
  };

  if (loading) {
    return (
      <div className="card overflow-hidden" aria-busy="true">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-t border-gray-200 bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={clsx('bg-gray-50', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    alignmentClasses[column.align || 'left'],
                    column.sortable && onSort && 'cursor-pointer select-none hover:text-gray-700',
                    column.headerClassName,
                  )}
                  onClick={column.sortable ? () => handleSort(column) : undefined}
                  aria-sort={
                    sortConfig?.key === column.key
                      ? sortConfig.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable && onSort && (
                      <span className="inline-flex" aria-hidden="true">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={clsx('hover:bg-gray-50', onRowClick && 'cursor-pointer')}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-6 py-4 whitespace-nowrap text-sm',
                      alignmentClasses[column.align || 'left'],
                      column.className,
                    )}
                  >
                    {column.render
                      ? column.render(item, index)
                      : (item as Record<string, unknown>)[column.key]?.toString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';
