import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ApprovalQueuePage } from '../ApprovalQueuePage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock approvals service
const mockGetPendingApprovalsQuery = vi.fn();
vi.mock('@/features/approvals/services/approvals.service', () => ({
  useGetPendingApprovalsQuery: (...args: unknown[]) => mockGetPendingApprovalsQuery(...args),
  useApproveExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useRejectExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useBulkApproveMutation: () => [vi.fn(), { isLoading: false }],
  useRequestClarificationMutation: () => [vi.fn(), { isLoading: false }],
}));

// Mock useRolePermissions hook
vi.mock('@/hooks', () => ({
  useRolePermissions: () => ({
    canApprove: true,
    canEmergencyApprove: false,
    isCEO: false,
  }),
}));

// Mock utilities
vi.mock('@/utils/error', () => ({
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const mockApprovals = [
  {
    id: 'exp-1',
    expenseNumber: 'EXP-001',
    description: 'Team dinner',
    amount: 3500,
    totalAmount: 3500,
    currency: 'PKR',
    status: 'PENDING_APPROVAL' as const,
    expenseDate: '2025-02-01T00:00:00Z',
    createdAt: '2025-02-01T00:00:00Z',
    submittedAt: '2025-02-01T12:00:00Z',
    submitter: { id: 'user-2', firstName: 'John', lastName: 'Doe' },
    category: { id: 'cat-1', name: 'Meals' },
  },
  {
    id: 'exp-2',
    expenseNumber: 'EXP-002',
    description: 'Software license',
    amount: 12000,
    totalAmount: 12000,
    currency: 'PKR',
    status: 'PENDING_APPROVAL' as const,
    expenseDate: '2025-02-02T00:00:00Z',
    createdAt: '2025-02-02T00:00:00Z',
    submittedAt: '2025-02-02T10:00:00Z',
    submitter: { id: 'user-3', firstName: 'Jane', lastName: 'Smith' },
    category: { id: 'cat-2', name: 'Software' },
  },
];

describe('ApprovalQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeleton', () => {
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    });

    renderWithProviders(<ApprovalQueuePage />);

    expect(screen.getByRole('heading', { name: /pending approvals/i })).toBeInTheDocument();
    // Should not show empty state or error during loading
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
  });

  it('renders approval list with expense details', () => {
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: {
        data: mockApprovals,
        meta: {
          pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ApprovalQueuePage />);

    expect(screen.getByRole('heading', { name: /pending approvals/i })).toBeInTheDocument();
    // Both mobile and desktop layouts render each expense, so use getAllByText
    expect(screen.getAllByText('EXP-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('EXP-002').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Team dinner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Software license').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no pending approvals', () => {
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ApprovalQueuePage />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByText(/no pending approvals at the moment/i)).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const mockRefetch = vi.fn();
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mockRefetch,
    });

    renderWithProviders(<ApprovalQueuePage />);

    expect(screen.getByText(/failed to load pending approvals/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders approve, reject, and clarify action buttons for each expense', () => {
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: {
        data: [mockApprovals[0]],
        meta: {
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ApprovalQueuePage />);

    // Desktop table has action buttons; mobile cards also have them
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    expect(approveButtons.length).toBeGreaterThanOrEqual(1);

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    expect(rejectButtons.length).toBeGreaterThanOrEqual(1);

    const clarifyButtons = screen.getAllByRole('button', { name: /clarify/i });
    expect(clarifyButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders select all checkbox', () => {
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: {
        data: mockApprovals,
        meta: {
          pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ApprovalQueuePage />);

    expect(screen.getByRole('checkbox', { name: /select all approvals/i })).toBeInTheDocument();
  });

  it('shows count of pending expenses', () => {
    mockGetPendingApprovalsQuery.mockReturnValue({
      data: {
        data: mockApprovals,
        meta: {
          pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ApprovalQueuePage />);

    expect(screen.getByText(/2 expense\(s\) awaiting your approval/i)).toBeInTheDocument();
  });
});
