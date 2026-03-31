import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ExpenseListPage } from '../ExpenseListPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock expenses service
const mockGetExpensesQuery = vi.fn();
vi.mock('@/features/expenses/services/expenses.service', () => ({
  useGetExpensesQuery: (...args: unknown[]) => mockGetExpensesQuery(...args),
  useSubmitExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useBulkSubmitExpensesMutation: () => [vi.fn(), { isLoading: false }],
  useBulkDeleteExpensesMutation: () => [vi.fn(), { isLoading: false }],
}));

// Mock expense components
vi.mock('@/components/expenses', () => ({
  ExpenseCard: () => <div data-testid="expense-card" />,
  ExpenseFilters: ({ onFiltersChange: _onFiltersChange }: { onFiltersChange: unknown }) => (
    <div data-testid="expense-filters" />
  ),
  ViewToggle: () => <div data-testid="view-toggle" />,
  BulkActions: () => <div data-testid="bulk-actions" />,
  useViewPreference: () => ['list', vi.fn()],
}));

const mockExpenses = [
  {
    id: 'exp-1',
    expenseNumber: 'EXP-001',
    description: 'Flight to New York',
    amount: 500,
    totalAmount: 500,
    currency: 'PKR',
    status: 'SUBMITTED' as const,
    expenseDate: '2025-01-15T00:00:00Z',
    createdAt: '2025-01-15T00:00:00Z',
    category: { id: 'cat-1', name: 'Travel' },
  },
  {
    id: 'exp-2',
    expenseNumber: 'EXP-002',
    description: 'Office supplies',
    amount: 150,
    totalAmount: 150,
    currency: 'PKR',
    status: 'DRAFT' as const,
    expenseDate: '2025-01-16T00:00:00Z',
    createdAt: '2025-01-16T00:00:00Z',
    category: { id: 'cat-2', name: 'Office Supplies' },
  },
];

describe('ExpenseListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeleton table', () => {
    mockGetExpensesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ExpenseListPage />);

    expect(screen.getByRole('heading', { name: /my expenses/i })).toBeInTheDocument();
    // SkeletonTable renders multiple skeleton rows
    expect(screen.queryByText(/no expenses found/i)).not.toBeInTheDocument();
  });

  it('renders expense table when data is loaded', () => {
    mockGetExpensesQuery.mockReturnValue({
      data: {
        data: mockExpenses,
        meta: {
          pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ExpenseListPage />);

    expect(screen.getByRole('heading', { name: /my expenses/i })).toBeInTheDocument();
    expect(screen.getByText('EXP-001')).toBeInTheDocument();
    expect(screen.getByText('EXP-002')).toBeInTheDocument();
    expect(screen.getByText('Flight to New York')).toBeInTheDocument();
    expect(screen.getByText('Office supplies')).toBeInTheDocument();
  });

  it('renders empty state when no expenses exist', () => {
    mockGetExpensesQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ExpenseListPage />);

    expect(screen.getByText(/no expenses found/i)).toBeInTheDocument();
    expect(screen.getByText(/get started by creating your first expense/i)).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const mockRefetch = vi.fn();
    mockGetExpensesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Server error' },
      refetch: mockRefetch,
    });

    renderWithProviders(<ExpenseListPage />);

    expect(screen.getByText(/failed to load expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  it('renders page header with create expense link', () => {
    mockGetExpensesQuery.mockReturnValue({
      data: { data: [], meta: { pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ExpenseListPage />);

    const createLinks = screen.getAllByRole('link', { name: /expense/i });
    const newExpenseLink = createLinks.find((link) => link.getAttribute('href') === '/expenses/new');
    expect(newExpenseLink).toBeDefined();
  });

  it('renders category and status columns in table view', () => {
    mockGetExpensesQuery.mockReturnValue({
      data: {
        data: mockExpenses,
        meta: {
          pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ExpenseListPage />);

    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
