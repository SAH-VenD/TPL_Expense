import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import {
  ExpenseCard,
  ExpenseFilters,
  ViewToggle,
  BulkActions,
  useViewPreference,
} from '@/components/expenses';
import {
  useGetExpensesQuery,
  useSubmitExpenseMutation,
  useDeleteExpenseMutation,
  useBulkSubmitExpensesMutation,
  useBulkDeleteExpensesMutation,
} from '@/features/expenses/services/expenses.service';
import type {
  Expense,
  ExpenseStatus,
  ExpenseFilters as ExpenseFiltersType,
} from '@/features/expenses/services/expenses.service';
import { formatDistanceToNow, format } from 'date-fns';

const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatRelativeDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
};

const statusLabels: Record<ExpenseStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLARIFICATION_REQUESTED: 'Clarification',
  RESUBMITTED: 'Resubmitted',
  PAID: 'Paid',
};

export function ExpenseListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useViewPreference('list');
  const [selectedExpenses, setSelectedExpenses] = React.useState<Set<string>>(new Set());

  // Parse pagination from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  // Filters state (parsed from URL in ExpenseFilters component)
  const [filters, setFilters] = React.useState<ExpenseFiltersType>(() => {
    const statusParam = searchParams.get('status');
    return {
      page,
      pageSize,
      search: searchParams.get('search') || undefined,
      status: statusParam ? (statusParam.split(',') as ExpenseStatus[]) : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      amountMin: searchParams.get('amountMin') ? Number(searchParams.get('amountMin')) : undefined,
      amountMax: searchParams.get('amountMax') ? Number(searchParams.get('amountMax')) : undefined,
      sort: (searchParams.get('sort') as ExpenseFiltersType['sort']) || 'createdAt:desc',
    };
  });

  // RTK Query hooks
  const { data, isLoading, isError, error, refetch } = useGetExpensesQuery(filters);
  const [_submitExpense] = useSubmitExpenseMutation();
  const [_deleteExpense] = useDeleteExpenseMutation();
  const [bulkSubmit, { isLoading: isBulkSubmitting }] = useBulkSubmitExpensesMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteExpensesMutation();

  const expenses = data?.data || [];
  const pagination = data?.meta?.pagination;

  // Handle filter changes
  const handleFiltersChange = React.useCallback(
    (newFilters: ExpenseFiltersType) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
        page: 1, // Reset to first page when filters change
      }));
      // Update URL with new filters
      const params = new URLSearchParams(searchParams);
      params.set('page', '1');
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Handle page change
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      setFilters((prev) => ({ ...prev, page: newPage }));
      const params = new URLSearchParams(searchParams);
      params.set('page', String(newPage));
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Selection handlers
  const handleSelectExpense = React.useCallback((expenseId: string, selected: boolean) => {
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(expenseId);
      } else {
        next.delete(expenseId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = React.useCallback(() => {
    if (selectedExpenses.size === expenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(expenses.map((e) => e.id)));
    }
  }, [expenses, selectedExpenses.size]);

  // Bulk actions
  const handleBulkSubmit = async () => {
    const draftIds = expenses
      .filter((e) => selectedExpenses.has(e.id) && e.status === 'DRAFT')
      .map((e) => e.id);
    if (draftIds.length > 0) {
      await bulkSubmit(draftIds);
      setSelectedExpenses(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const draftIds = expenses
      .filter((e) => selectedExpenses.has(e.id) && e.status === 'DRAFT')
      .map((e) => e.id);
    if (draftIds.length > 0) {
      await bulkDelete(draftIds);
      setSelectedExpenses(new Set());
    }
  };

  // Row click handler
  const handleRowClick = React.useCallback(
    (expense: Expense) => {
      navigate(`/expenses/${expense.id}`);
    },
    [navigate]
  );

  // Table columns for list view
  const columns: Column<Expense>[] = React.useMemo(
    () => [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            checked={selectedExpenses.size === expenses.length && expenses.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
          />
        ) as unknown as string,
        render: (expense) => (
          <input
            type="checkbox"
            checked={selectedExpenses.has(expense.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleSelectExpense(expense.id, e.target.checked)}
            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
          />
        ),
        className: 'w-10',
      },
      {
        key: 'expenseNumber',
        header: 'Expense #',
        render: (expense) => (
          <Link
            to={`/expenses/${expense.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            {expense.expenseNumber || `EXP-${expense.id.slice(0, 6)}`}
          </Link>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (expense) => (
          <span className="text-gray-900 truncate max-w-xs block">
            {expense.description || 'No description'}
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (expense) => (
          <span className="text-gray-500">{expense.category?.name || '-'}</span>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        render: (expense) => (
          <span className="text-gray-500" title={format(new Date(expense.expenseDate), 'PPP')}>
            {formatRelativeDate(expense.expenseDate)}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (expense) => (
          <span className="font-medium text-gray-900">
            {formatCurrency(expense.totalAmount || expense.amount, expense.currency)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (expense) => (
          <Badge variant={getStatusVariant(expense.status)} size="sm">
            {statusLabels[expense.status]}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (expense) => (
          <Link
            to={`/expenses/${expense.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View
          </Link>
        ),
      },
    ],
    [selectedExpenses, expenses.length, handleSelectAll, handleSelectExpense]
  );

  // Selected items for bulk actions
  const selectedItems = React.useMemo(
    () => expenses.filter((e) => selectedExpenses.has(e.id)),
    [expenses, selectedExpenses]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="My Expenses"
        subtitle="Manage and track your expense submissions"
        breadcrumbs={[{ label: 'Expenses' }]}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <Link
              to="/expenses/new"
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Expense
            </Link>
          </>
        }
      />

      {/* Filters */}
      <ExpenseFilters onFiltersChange={handleFiltersChange} loading={isLoading} />

      {/* Error State */}
      {isError && (
        <Alert variant="error" title="Failed to load expenses">
          {(error as { message?: string })?.message || 'An error occurred while loading expenses.'}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && <SkeletonTable rows={5} columns={7} />}

      {/* Empty State */}
      {!isLoading && !isError && expenses.length === 0 && (
        <EmptyState
          title="No expenses found"
          description={
            filters.search || filters.status?.length
              ? 'Try adjusting your filters to find what you are looking for.'
              : 'Get started by creating your first expense.'
          }
          action={
            <Link
              to="/expenses/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5" />
              Create Expense
            </Link>
          }
        />
      )}

      {/* Content */}
      {!isLoading && !isError && expenses.length > 0 && (
        <>
          {view === 'list' ? (
            <DataTable
              columns={columns}
              data={expenses}
              keyExtractor={(expense) => expense.id}
              onRowClick={handleRowClick}
              emptyMessage="No expenses found"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  view="grid"
                  selected={selectedExpenses.has(expense.id)}
                  onSelectionChange={(selected) => handleSelectExpense(expense.id, selected)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.pageSize}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedExpenses.size}
        selectedItems={selectedItems}
        onSubmit={handleBulkSubmit}
        onDelete={handleBulkDelete}
        isLoading={isBulkSubmitting || isBulkDeleting}
      />
    </div>
  );
}
