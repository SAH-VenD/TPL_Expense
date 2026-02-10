import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogsPage } from './AuditLogsPage';
import { renderWithProviders } from '@/test/test-utils';

// Mock the admin service hooks
vi.mock('@/features/admin/services/admin.service', () => ({
  useGetAuditLogsQuery: vi.fn(),
}));

import { useGetAuditLogsQuery } from '@/features/admin/services/admin.service';

const mockUseGetAuditLogsQuery = vi.mocked(useGetAuditLogsQuery);

// Mock data - use unique entityTypes that don't collide with filter dropdown options
const mockAuditLogs = [
  {
    id: 'log-1',
    userId: 'user-1',
    user: { id: 'user-1', firstName: 'Admin', lastName: 'User' },
    action: 'CREATE',
    entityType: 'Expense',
    entityId: 'exp-1',
    oldValue: null,
    newValue: { amount: 5000, description: 'Office supplies' },
    ipAddress: '192.168.1.1',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'log-2',
    userId: null,
    user: null,
    action: 'LOGIN',
    entityType: 'Session',
    entityId: 'session-2',
    oldValue: null,
    newValue: null,
    ipAddress: '10.0.0.1',
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'log-3',
    userId: 'user-3',
    user: { id: 'user-3', firstName: 'Finance', lastName: 'Manager' },
    action: 'APPROVE',
    entityType: 'Voucher',
    entityId: 'voucher-1',
    oldValue: { status: 'PENDING' },
    newValue: { status: 'APPROVED' },
    ipAddress: '172.16.0.5',
    createdAt: '2026-02-01T08:00:00Z',
  },
];

const mockPagination = {
  total: 3,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

const mockMultiPagePagination = {
  total: 120,
  page: 1,
  pageSize: 50,
  totalPages: 3,
};

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAuditLogsQuery.mockReturnValue({
      data: {
        data: mockAuditLogs,
        meta: { pagination: mockPagination },
      },
      isLoading: false,
      isError: false,
      error: undefined,
    } as never);
  });

  // ==================== LOADING STATE ====================

  describe('Loading State', () => {
    it('renders spinner while loading', () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: undefined,
      } as never);

      const { container } = renderWithProviders(<AuditLogsPage />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ==================== ERROR STATE ====================

  describe('Error State', () => {
    it('shows error message on failure', () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { data: { message: 'Unauthorized' } },
      } as never);

      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('Failed to load audit logs')).toBeInTheDocument();
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });

    it('shows fallback error message when no detail provided', () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: {},
      } as never);

      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('Please try again later')).toBeInTheDocument();
    });
  });

  // ==================== EMPTY STATE ====================

  describe('Empty State', () => {
    it('shows empty message when no logs match filters', () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: {
          data: [],
          meta: { pagination: { ...mockPagination, total: 0 } },
        },
        isLoading: false,
        isError: false,
        error: undefined,
      } as never);

      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText(/no audit logs found/i)).toBeInTheDocument();
    });
  });

  // ==================== TABLE RENDERING ====================

  describe('Table Rendering', () => {
    it('renders page heading', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByRole('heading', { name: /audit logs/i })).toBeInTheDocument();
    });

    it('renders breadcrumb with Admin link', () => {
      renderWithProviders(<AuditLogsPage />);

      const adminLink = screen.getByRole('link', { name: /admin/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/admin/users');
    });

    it('renders table column headers', () => {
      renderWithProviders(<AuditLogsPage />);

      const table = screen.getByRole('table');
      const headers = within(table).getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);

      expect(headerTexts).toContain('Timestamp');
      expect(headerTexts).toContain('Action');
      expect(headerTexts).toContain('Entity');
      expect(headerTexts).toContain('IP Address');
      expect(headerTexts).toContain('Details');
    });

    it('displays user name for logs with user data', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    it('shows "System" for logs without user data', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('displays action badges with correct text', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('CREATE')).toBeInTheDocument();
      expect(screen.getByText('LOGIN')).toBeInTheDocument();
      expect(screen.getByText('APPROVE')).toBeInTheDocument();
    });

    it('displays entity IDs in table rows', () => {
      renderWithProviders(<AuditLogsPage />);

      const table = screen.getByRole('table');
      expect(within(table).getByText('exp-1')).toBeInTheDocument();
      expect(within(table).getByText('voucher-1')).toBeInTheDocument();
    });

    it('displays IP addresses', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    });

    it('renders View button for each log entry', () => {
      renderWithProviders(<AuditLogsPage />);

      const viewButtons = screen.getAllByText('View');
      expect(viewButtons).toHaveLength(3);
    });
  });

  // ==================== FILTERS ====================

  describe('Filters', () => {
    it('renders action filter dropdown with all options', () => {
      renderWithProviders(<AuditLogsPage />);

      const actionSelect = screen.getByLabelText('Action');
      expect(actionSelect).toBeInTheDocument();

      const options = within(actionSelect).getAllByRole('option');
      expect(options[0]).toHaveTextContent('All Actions');
      expect(options).toHaveLength(8); // All Actions + 7 action types
    });

    it('renders entity type filter dropdown with all options', () => {
      renderWithProviders(<AuditLogsPage />);

      const entitySelect = screen.getByLabelText('Entity Type');
      expect(entitySelect).toBeInTheDocument();

      const options = within(entitySelect).getAllByRole('option');
      expect(options[0]).toHaveTextContent('All Types');
      expect(options).toHaveLength(8); // All Types + 7 entity types
    });

    it('renders Clear Filters button', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('changing action filter calls query with new params', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const actionSelect = screen.getByLabelText('Action');
      await user.selectOptions(actionSelect, 'CREATE');

      const lastCall = mockUseGetAuditLogsQuery.mock.calls.at(-1)![0];
      expect(lastCall).toEqual(expect.objectContaining({ action: 'CREATE', page: 1 }));
    });

    it('changing entity type filter calls query with new params', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const entitySelect = screen.getByLabelText('Entity Type');
      await user.selectOptions(entitySelect, 'Expense');

      const lastCall = mockUseGetAuditLogsQuery.mock.calls.at(-1)![0];
      expect(lastCall).toEqual(expect.objectContaining({ entityType: 'Expense', page: 1 }));
    });

    it('clicking Clear Filters resets all filters', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const actionSelect = screen.getByLabelText('Action');
      await user.selectOptions(actionSelect, 'DELETE');

      await user.click(screen.getByText('Clear Filters'));

      const lastCall = mockUseGetAuditLogsQuery.mock.calls.at(-1)![0];
      expect(lastCall).toEqual({ page: 1 });
    });
  });

  // ==================== PAGINATION ====================

  describe('Pagination', () => {
    it('does not render pagination when only one page', () => {
      renderWithProviders(<AuditLogsPage />);

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('renders pagination controls when multiple pages', () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: {
          data: mockAuditLogs,
          meta: { pagination: mockMultiPagePagination },
        },
        isLoading: false,
        isError: false,
        error: undefined,
      } as never);

      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText(/120 total/)).toBeInTheDocument();
    });

    it('disables Previous button on first page', () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: {
          data: mockAuditLogs,
          meta: { pagination: mockMultiPagePagination },
        },
        isLoading: false,
        isError: false,
        error: undefined,
      } as never);

      renderWithProviders(<AuditLogsPage />);

      expect(screen.getByText('Previous')).toBeDisabled();
      expect(screen.getByText('Next')).not.toBeDisabled();
    });

    it('clicking Next advances to next page', async () => {
      mockUseGetAuditLogsQuery.mockReturnValue({
        data: {
          data: mockAuditLogs,
          meta: { pagination: mockMultiPagePagination },
        },
        isLoading: false,
        isError: false,
        error: undefined,
      } as never);

      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText('Next'));

      const lastCall = mockUseGetAuditLogsQuery.mock.calls.at(-1)![0];
      expect(lastCall).toEqual(expect.objectContaining({ page: 2 }));
    });
  });

  // ==================== DETAIL MODAL ====================

  describe('Detail Modal', () => {
    it('opens modal when clicking View on a log entry', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
    });

    it('displays log details in modal', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
      expect(screen.getByText('Entity ID')).toBeInTheDocument();
    });

    it('displays new value when present', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]); // log-1 has newValue

      expect(screen.getByText('New Value')).toBeInTheDocument();
    });

    it('displays old and new values for update logs', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[2]); // log-3 has both oldValue and newValue

      expect(screen.getByText('Previous Value')).toBeInTheDocument();
      expect(screen.getByText('New Value')).toBeInTheDocument();
    });

    it('closes modal when clicking Close button', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(screen.getByText('Audit Log Details')).toBeInTheDocument();

      await user.click(screen.getByText('Close'));

      expect(screen.queryByText('Audit Log Details')).not.toBeInTheDocument();
    });

    it('shows entity ID in modal', async () => {
      renderWithProviders(<AuditLogsPage />);
      const user = userEvent.setup();

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(screen.getByText('Entity ID')).toBeInTheDocument();
    });
  });
});
