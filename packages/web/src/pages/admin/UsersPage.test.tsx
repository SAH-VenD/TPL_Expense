import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersPage } from './UsersPage';
import { renderWithProviders, mockActiveUser, mockPendingUser, mockInactiveUser, mockDepartments } from '@/test/test-utils';

// Mock the admin service hooks
vi.mock('@/features/admin/services/admin.service', () => ({
  useGetUsersQuery: vi.fn(),
  useCreateUserMutation: vi.fn(),
  useApproveUserMutation: vi.fn(),
  useDeactivateUserMutation: vi.fn(),
  useReactivateUserMutation: vi.fn(),
  useGetDepartmentsQuery: vi.fn(),
}));

// Import the mocked hooks
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useApproveUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useGetDepartmentsQuery,
} from '@/features/admin/services/admin.service';

// Type the mocked functions
const mockUseGetUsersQuery = vi.mocked(useGetUsersQuery);
const mockUseCreateUserMutation = vi.mocked(useCreateUserMutation);
const mockUseApproveUserMutation = vi.mocked(useApproveUserMutation);
const mockUseDeactivateUserMutation = vi.mocked(useDeactivateUserMutation);
const mockUseReactivateUserMutation = vi.mocked(useReactivateUserMutation);
const mockUseGetDepartmentsQuery = vi.mocked(useGetDepartmentsQuery);

describe('UsersPage', () => {
  const mockApproveUser = vi.fn();
  const mockCreateUser = vi.fn();
  const mockDeactivateUser = vi.fn();
  const mockReactivateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseGetUsersQuery.mockReturnValue({
      data: {
        data: [mockActiveUser, mockPendingUser, mockInactiveUser],
        meta: { pagination: { total: 3, page: 1, pageSize: 20, totalPages: 1 } },
      },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as never);

    mockUseGetDepartmentsQuery.mockReturnValue({
      data: mockDepartments,
      isLoading: false,
    } as never);

    mockUseCreateUserMutation.mockReturnValue([
      mockCreateUser,
      { isLoading: false },
    ] as never);

    mockUseApproveUserMutation.mockReturnValue([
      mockApproveUser,
      { isLoading: false },
    ] as never);

    mockUseDeactivateUserMutation.mockReturnValue([
      mockDeactivateUser,
      { isLoading: false },
    ] as never);

    mockUseReactivateUserMutation.mockReturnValue([
      mockReactivateUser,
      { isLoading: false },
    ] as never);
  });

  describe('User List Display', () => {
    it('should display list of users', () => {
      renderWithProviders(<UsersPage />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Pending User')).toBeInTheDocument();
      expect(screen.getByText('Inactive User')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      mockUseGetUsersQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
      } as never);

      const { container } = renderWithProviders(<UsersPage />);

      // The loading spinner is a div with animate-spin class
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show error message when fetch fails', () => {
      mockUseGetUsersQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Failed to fetch' },
      } as never);

      renderWithProviders(<UsersPage />);

      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });

    it('should show pending count alert when there are pending users', () => {
      renderWithProviders(<UsersPage />);

      // The alert box has a yellow background with the text "X user(s) pending approval"
      // Use a more specific selector to avoid matching the filter button
      expect(screen.getByText(/user\(s\) pending approval/i)).toBeInTheDocument();
    });

    it('should not show pending alert when no pending users', () => {
      mockUseGetUsersQuery.mockReturnValue({
        data: {
          data: [mockActiveUser],
          meta: { pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 } },
        },
        isLoading: false,
        error: undefined,
      } as never);

      renderWithProviders(<UsersPage />);

      // When no pending users, the yellow pending alert box should not appear
      // Note: "PENDING APPROVAL" filter button will still exist, so we check for the alert text specifically
      expect(screen.queryByText(/user\(s\) pending approval/i)).not.toBeInTheDocument();
    });

    it('should display user email', () => {
      renderWithProviders(<UsersPage />);

      expect(screen.getByText('admin@tekcellent.com')).toBeInTheDocument();
      expect(screen.getByText('pending@tekcellent.com')).toBeInTheDocument();
    });

    it('should display department name', () => {
      renderWithProviders(<UsersPage />);

      expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
    });

    it('should show "Not assigned" for users without department', () => {
      renderWithProviders(<UsersPage />);

      expect(screen.getByText('Not assigned')).toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('should show filter buttons', () => {
      renderWithProviders(<UsersPage />);

      // Filter buttons show status values with underscores replaced by spaces
      expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PENDING APPROVAL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ACTIVE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'INACTIVE' })).toBeInTheDocument();
    });

    it('should filter users by status when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      // Click on PENDING_APPROVAL filter
      await user.click(screen.getByRole('button', { name: 'PENDING APPROVAL' }));

      // Only pending user should be visible
      expect(screen.getByText('Pending User')).toBeInTheDocument();
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    });
  });

  describe('Approve User', () => {
    it('should show Approve button only for pending users', () => {
      renderWithProviders(<UsersPage />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      // Should only have 1 approve button (for the pending user)
      expect(approveButtons).toHaveLength(1);
    });

    it('should call approveUser mutation on click', async () => {
      const user = userEvent.setup();
      mockApproveUser.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /approve/i }));

      expect(mockApproveUser).toHaveBeenCalledWith('user-2'); // mockPendingUser.id
    });

    it('should show Approving... while loading', () => {
      mockUseApproveUserMutation.mockReturnValue([
        mockApproveUser,
        { isLoading: true },
      ] as never);

      renderWithProviders(<UsersPage />);

      expect(screen.getByText(/approving/i)).toBeInTheDocument();
    });
  });

  describe('Deactivate User', () => {
    it('should show Deactivate button only for active users', () => {
      renderWithProviders(<UsersPage />);

      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
      // Should only have 1 deactivate button (for the active admin user)
      expect(deactivateButtons).toHaveLength(1);
    });

    it('should open confirmation modal when clicking Deactivate', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /deactivate/i }));

      expect(screen.getByText(/are you sure you want to deactivate/i)).toBeInTheDocument();
      // The user name "Admin User" appears both in the table and in the modal (in bold)
      // Check that it appears at least twice (table + modal)
      expect(screen.getAllByText('Admin User').length).toBeGreaterThanOrEqual(2);
    });

    it('should call deactivateUser mutation on confirm', async () => {
      const user = userEvent.setup();
      mockDeactivateUser.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

      renderWithProviders(<UsersPage />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /deactivate/i }));
      // Confirm
      await user.click(screen.getAllByRole('button', { name: /deactivate/i })[1]);

      expect(mockDeactivateUser).toHaveBeenCalledWith('user-1'); // mockActiveUser.id
    });

    it('should close modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /deactivate/i }));
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      // Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  describe('Reactivate User', () => {
    it('should show Reactivate button for inactive users', () => {
      renderWithProviders(<UsersPage />);

      const reactivateButtons = screen.getAllByRole('button', { name: /reactivate/i });
      expect(reactivateButtons).toHaveLength(1);
    });

    it('should call reactivateUser mutation on confirm', async () => {
      const user = userEvent.setup();
      mockReactivateUser.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

      renderWithProviders(<UsersPage />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /reactivate/i }));
      // Confirm
      await user.click(screen.getAllByRole('button', { name: /reactivate/i })[1]);

      expect(mockReactivateUser).toHaveBeenCalledWith('user-3'); // mockInactiveUser.id
    });
  });

  describe('Create User Modal', () => {
    it('should open create user modal when Add User is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /add user/i }));

      expect(screen.getByText(/add new user/i)).toBeInTheDocument();
    });

    it('should show form fields in modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /add user/i }));

      // Check that the modal title and form elements are present
      expect(screen.getByText('Add New User')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('user@tekcellent.com')).toBeInTheDocument();
      // Check for form elements - there should be text inputs and selects
      const form = screen.getByRole('button', { name: /create user/i }).closest('form');
      expect(form).toBeInTheDocument();
      // Verify we have inputs for the form
      expect(form?.querySelectorAll('input').length).toBeGreaterThanOrEqual(3);
      expect(form?.querySelectorAll('select').length).toBe(2); // Role and Department
    });

    it('should close modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /add user/i }));
      expect(screen.getByText(/add new user/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText(/add new user/i)).not.toBeInTheDocument();
    });

    it('should validate email domain', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /add user/i }));

      // Get the form and find the inputs within it
      const form = screen.getByRole('button', { name: /create user/i }).closest('form');
      const formInputs = form?.querySelectorAll('input[type="text"], input[type="email"]');

      // formInputs[0] = First Name, formInputs[1] = Last Name, formInputs[2] = Email
      if (formInputs && formInputs.length >= 3) {
        await user.type(formInputs[0] as HTMLInputElement, 'John');
        await user.type(formInputs[1] as HTMLInputElement, 'Doe');
        await user.type(formInputs[2] as HTMLInputElement, 'john@gmail.com');
      }

      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/must be a @tekcellent.com address/i)).toBeInTheDocument();
      });
    });

    it('should call createUser mutation on valid submit', async () => {
      const user = userEvent.setup();
      mockCreateUser.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

      renderWithProviders(<UsersPage />);

      await user.click(screen.getByRole('button', { name: /add user/i }));

      // Fill out form using input fields directly
      const inputs = screen.getAllByRole('textbox');
      const emailInput = screen.getByPlaceholderText('user@tekcellent.com');

      // inputs[0] is search, inputs[1] and inputs[2] are first/last name in the modal
      await user.type(inputs[1], 'John');
      await user.type(inputs[2], 'Doe');
      await user.type(emailInput, 'john@tekcellent.com');

      await user.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'john@tekcellent.com',
            firstName: 'John',
            lastName: 'Doe',
          })
        );
      });
    });
  });

  describe('Search', () => {
    it('should have a search input', () => {
      renderWithProviders(<UsersPage />);

      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
    });

    it('should update search term on input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);

      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'admin');

      expect(searchInput).toHaveValue('admin');
    });
  });
});
