import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/test-utils';
import { BudgetDetailPage } from '../BudgetDetailPage';
import toast from 'react-hot-toast';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'budget-123' }),
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-hot-toast')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock data
const mockBudget: import('@/features/budgets/services/budgets.service').Budget = {
  id: 'budget-123',
  name: 'Q1 Marketing Budget',
  type: 'DEPARTMENT',
  period: 'QUARTERLY',
  currency: 'PKR',
  totalAmount: 1000000,
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-03-31T00:00:00Z',
  warningThreshold: 75,
  enforcement: 'SOFT_WARNING',
  departmentId: 'dept-1',
  department: { id: 'dept-1', name: 'Marketing' },
  projectId: undefined,
  project: undefined,
  categoryId: undefined,
  category: undefined,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

const mockBudgetExceeded = {
  ...mockBudget,
  id: 'budget-456',
  name: 'Exceeded Budget',
};

const mockBudgetWarning = {
  ...mockBudget,
  id: 'budget-789',
  name: 'Warning Budget',
};

// Mock query state
let mockQueryState = {
  data: mockBudget as typeof mockBudget | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

// Mock mutation state
const mockUpdateBudget = vi.fn();
const mockDeleteBudget = vi.fn();
const mockUpdateUnwrap = vi.fn();
const mockDeleteUnwrap = vi.fn();

vi.mock('@/features/budgets/services/budgets.service', () => ({
  useGetBudgetQuery: () => mockQueryState,
  useUpdateBudgetMutation: () => [mockUpdateBudget, { isLoading: false }],
  useDeleteBudgetMutation: () => [mockDeleteBudget, { isLoading: false }],
}));

// Mock the admin service for edit form
vi.mock('@/features/admin/services/admin.service', () => ({
  useGetDepartmentsQuery: () => ({
    data: [
      { id: 'dept-1', name: 'Marketing' },
      { id: 'dept-2', name: 'Engineering' },
    ],
    isLoading: false,
  }),
  useGetCategoriesQuery: () => ({
    data: [
      { id: 'cat-1', name: 'Travel' },
      { id: 'cat-2', name: 'Supplies' },
    ],
    isLoading: false,
  }),
}));

describe('BudgetDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryState = {
      data: mockBudget,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mockUpdateBudget.mockReturnValue({ unwrap: mockUpdateUnwrap });
    mockDeleteBudget.mockReturnValue({ unwrap: mockDeleteUnwrap });
    mockUpdateUnwrap.mockResolvedValue(mockBudget);
    mockDeleteUnwrap.mockResolvedValue(undefined);
  });

  describe('Loading State', () => {
    it('renders loading state while fetching', () => {
      mockQueryState = {
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      };

      renderWithProviders(<BudgetDetailPage />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error state on fetch failure with retry button', async () => {
      const mockRefetch = vi.fn();
      mockQueryState = {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText(/failed to load budget/i)).toBeInTheDocument();
      expect(screen.getByText(/we could not retrieve the budget details/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('shows back link in error state', () => {
      mockQueryState = {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      };

      renderWithProviders(<BudgetDetailPage />);

      const backLink = screen.getByRole('link', { name: /back to budgets/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/budgets');
    });
  });

  describe('Budget Details Display', () => {
    it('renders budget name as heading', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByRole('heading', { name: mockBudget.name })).toBeInTheDocument();
    });

    it('renders budget type and period', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText(/department budget/i)).toBeInTheDocument();
      // 'quarterly' appears multiple times (in subtitle and in details), so use getAllByText
      expect(screen.getAllByText(/quarterly/i).length).toBeGreaterThan(0);
    });

    it('renders back link to /budgets', () => {
      renderWithProviders(<BudgetDetailPage />);

      const backLink = screen.getByRole('link', { name: /back to budgets/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/budgets');
    });

    it('renders active status badge', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders inactive status badge when budget is inactive', () => {
      mockQueryState = {
        ...mockQueryState,
        data: { ...mockBudget, isActive: false },
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders budget details section with type, period, dates', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Budget Details')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
      expect(screen.getByText('Warning Threshold')).toBeInTheDocument();
      expect(screen.getByText('Enforcement')).toBeInTheDocument();
    });

    it('renders department name when assigned', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('renders financial summary with total, used, and remaining amounts', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
      expect(screen.getByText('Total Budget')).toBeInTheDocument();
      expect(screen.getByText('Used')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
    });

    it('renders warning threshold percentage', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('renders record information with created and updated dates', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Record Information')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
    });
  });

  describe('Utilization Progress Bar', () => {
    it('displays utilization progress bar', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Budget Utilization')).toBeInTheDocument();
      // 75% utilization (750000 / 1000000)
      expect(screen.getByText('75.0%')).toBeInTheDocument();
    });

    it('shows warning when utilization >= warning threshold', () => {
      mockQueryState = {
        ...mockQueryState,
        data: mockBudgetWarning,
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Budget Warning')).toBeInTheDocument();
      expect(screen.getByText(/has reached 80.0% utilization/i)).toBeInTheDocument();
    });

    it('shows exceeded alert when utilization > 100%', () => {
      mockQueryState = {
        ...mockQueryState,
        data: mockBudgetExceeded,
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Budget Exceeded')).toBeInTheDocument();
      expect(screen.getByText(/has exceeded its allocated amount/i)).toBeInTheDocument();
    });

    it('does not show warning alert when below threshold', () => {
      // With no utilization data, no warning alerts should appear
      mockQueryState = {
        ...mockQueryState,
        data: mockBudget,
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.queryByText('Budget Warning')).not.toBeInTheDocument();
      expect(screen.queryByText('Budget Exceeded')).not.toBeInTheDocument();
    });
  });

  describe('Edit Modal', () => {
    it('edit button opens edit modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BudgetDetailPage />);

      const editButton = screen.getByRole('button', { name: /edit budget/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      // 'Edit Budget' appears both as button text and modal title, so use getAllByText
      expect(screen.getAllByText('Edit Budget').length).toBeGreaterThan(1);
    });

    it('edit modal shows form with pre-filled data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BudgetDetailPage />);

      const editButton = screen.getByRole('button', { name: /edit budget/i });
      await user.click(editButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      // Form should have the budget name pre-filled
      const nameInput = screen.getByDisplayValue(mockBudget.name);
      expect(nameInput).toBeInTheDocument();
    });

    it('cancel in edit modal closes the modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BudgetDetailPage />);

      const editButton = screen.getByRole('button', { name: /edit budget/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find the cancel button within the modal (last cancel button is in the form)
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      const modalCancelButton = cancelButtons.at(-1)!;
      await user.click(modalCancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('successful update closes modal and shows success toast', async () => {
      const user = userEvent.setup();
      mockUpdateUnwrap.mockResolvedValue({ ...mockBudget, name: 'Updated Budget' });

      renderWithProviders(<BudgetDetailPage />);

      const editButton = screen.getByRole('button', { name: /edit budget/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modify the name
      const nameInput = screen.getByDisplayValue(mockBudget.name);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget Name');

      // Submit the form
      const updateButton = screen.getByRole('button', { name: /update budget/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockUpdateBudget).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Budget updated successfully');
      });
    });

    it('update failure shows error toast', async () => {
      const user = userEvent.setup();
      mockUpdateUnwrap.mockRejectedValue({
        data: { message: 'Update failed' },
      });

      renderWithProviders(<BudgetDetailPage />);

      const editButton = screen.getByRole('button', { name: /edit budget/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modify the name
      const nameInput = screen.getByDisplayValue(mockBudget.name);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget Name');

      // Submit the form
      const updateButton = screen.getByRole('button', { name: /update budget/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Update failed');
      });
    });
  });

  describe('Delete Confirmation', () => {
    it('delete button shows confirmation dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BudgetDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete budget/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    it('confirm delete calls mutation and navigates', async () => {
      const user = userEvent.setup();
      mockDeleteUnwrap.mockResolvedValue(undefined);

      renderWithProviders(<BudgetDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete budget/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Find confirm button in the dialog
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteBudget).toHaveBeenCalledWith('budget-123');
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Budget deleted successfully');
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/budgets');
      });
    });

    it('cancel delete closes dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BudgetDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete budget/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Find cancel button in the dialog
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      });

      // Should not call delete or navigate
      expect(mockDeleteBudget).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('delete failure shows error toast and closes dialog', async () => {
      const user = userEvent.setup();
      mockDeleteUnwrap.mockRejectedValue({
        data: { message: 'Cannot delete budget with expenses' },
      });

      renderWithProviders(<BudgetDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete budget/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Cannot delete budget with expenses');
      });

      // Should not navigate on error
      expect(mockNavigate).not.toHaveBeenCalledWith('/budgets');
    });
  });

  describe('Quick Stats', () => {
    it('renders quick stats section', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
      expect(screen.getByText('Daily Average')).toBeInTheDocument();
      expect(screen.getByText('Days Remaining')).toBeInTheDocument();
      expect(screen.getByText('Currency')).toBeInTheDocument();
    });

    it('displays currency in quick stats', () => {
      renderWithProviders(<BudgetDetailPage />);

      const currencyElements = screen.getAllByText('PKR');
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Actions Section', () => {
    it('renders actions section with edit and delete buttons', () => {
      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit budget/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete budget/i })).toBeInTheDocument();
    });
  });

  describe('Budget with Project Assignment', () => {
    it('renders project name when assigned', () => {
      mockQueryState = {
        ...mockQueryState,
        data: {
          ...mockBudget,
          type: 'PROJECT',
          departmentId: undefined,
          department: undefined,
          projectId: 'proj-1',
          project: { id: 'proj-1', name: 'Website Redesign' },
        },
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    });
  });

  describe('Budget with Category Assignment', () => {
    it('renders category name when assigned', () => {
      mockQueryState = {
        ...mockQueryState,
        data: {
          ...mockBudget,
          type: 'CATEGORY',
          departmentId: undefined,
          department: undefined,
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Travel Expenses' },
        },
      };

      renderWithProviders(<BudgetDetailPage />);

      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Travel Expenses')).toBeInTheDocument();
    });
  });
});
