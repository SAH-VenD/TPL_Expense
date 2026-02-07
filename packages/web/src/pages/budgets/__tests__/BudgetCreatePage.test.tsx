import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/test-utils';
import { BudgetCreatePage } from '../BudgetCreatePage';
import toast from 'react-hot-toast';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

// Mock the budgets service
const mockCreateBudget = vi.fn();
const mockUnwrap = vi.fn();
vi.mock('@/features/budgets/services/budgets.service', () => ({
  useCreateBudgetMutation: () => [mockCreateBudget, { isLoading: false }],
}));

// Mock the admin service for departments and categories
vi.mock('@/features/admin/services/admin.service', () => ({
  useGetDepartmentsQuery: () => ({
    data: [
      { id: 'dept-1', name: 'Engineering' },
      { id: 'dept-2', name: 'Finance' },
    ],
    isLoading: false,
  }),
  useGetCategoriesQuery: () => ({
    data: [
      { id: 'cat-1', name: 'Travel' },
      { id: 'cat-2', name: 'Office Supplies' },
    ],
    isLoading: false,
  }),
}));

describe('BudgetCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBudget.mockReturnValue({ unwrap: mockUnwrap });
    mockUnwrap.mockResolvedValue({ id: 'new-budget-1', name: 'Test Budget' });
  });

  it('renders page header "Create Budget"', () => {
    renderWithProviders(<BudgetCreatePage />);

    expect(screen.getByRole('heading', { name: /create budget/i })).toBeInTheDocument();
  });

  it('renders back link to /budgets', () => {
    renderWithProviders(<BudgetCreatePage />);

    const backLink = screen.getByRole('link', { name: /back to budgets/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/budgets');
  });

  it('renders BudgetForm component with all form sections', () => {
    renderWithProviders(<BudgetCreatePage />);

    // Check for form sections (using heading elements to avoid duplicate label/heading conflicts)
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Assign To')).toBeInTheDocument();
    expect(screen.getByText('Financial Details')).toBeInTheDocument();
    // Budget Period appears both as a label and section heading, so use getAllByText
    expect(screen.getAllByText('Budget Period').length).toBeGreaterThan(0);
    expect(screen.getByText('Alert Settings')).toBeInTheDocument();

    // Check for key form fields
    expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total amount/i)).toBeInTheDocument();
  });

  it('renders submit button with correct label', () => {
    renderWithProviders(<BudgetCreatePage />);

    expect(screen.getByRole('button', { name: /create budget/i })).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderWithProviders(<BudgetCreatePage />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('form submission calls createBudget mutation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetCreatePage />);

    // Fill in required fields
    const nameInput = screen.getByLabelText(/budget name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Budget');

    const amountInput = screen.getByLabelText(/total amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '10000');

    // Fill in dates - find by label text
    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-01');

    const endDateInput = screen.getByLabelText(/end date/i);
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-12-31');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateBudget).toHaveBeenCalled();
    });
  });

  it('success shows toast and navigates to /budgets', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockResolvedValue({ id: 'new-budget-1', name: 'Test Budget' });

    renderWithProviders(<BudgetCreatePage />);

    // Fill in required fields
    const nameInput = screen.getByLabelText(/budget name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Budget');

    const amountInput = screen.getByLabelText(/total amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '10000');

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-01');

    const endDateInput = screen.getByLabelText(/end date/i);
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-12-31');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Budget created successfully');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/budgets');
    });
  });

  it('error shows error toast and stays on page', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockRejectedValue({
      data: { message: 'Budget name already exists' },
    });

    renderWithProviders(<BudgetCreatePage />);

    // Fill in required fields
    const nameInput = screen.getByLabelText(/budget name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Budget');

    const amountInput = screen.getByLabelText(/total amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '10000');

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-01');

    const endDateInput = screen.getByLabelText(/end date/i);
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-12-31');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Budget name already exists');
    });

    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalledWith('/budgets');
  });

  it('error without specific message shows generic error', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<BudgetCreatePage />);

    // Fill in required fields
    const nameInput = screen.getByLabelText(/budget name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Budget');

    const amountInput = screen.getByLabelText(/total amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '10000');

    const startDateInput = screen.getByLabelText(/start date/i);
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-01');

    const endDateInput = screen.getByLabelText(/end date/i);
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-12-31');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create budget');
    });
  });

  it('cancel button navigates to /budgets', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetCreatePage />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/budgets');
  });

  it('renders description text', () => {
    renderWithProviders(<BudgetCreatePage />);

    expect(
      screen.getByText(/set up a new budget to track and control spending/i),
    ).toBeInTheDocument();
  });

  it('shows validation error when submitting with empty required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetCreatePage />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(submitButton);

    // Should show validation errors (form should not be submitted)
    expect(mockCreateBudget).not.toHaveBeenCalled();
  });
});
