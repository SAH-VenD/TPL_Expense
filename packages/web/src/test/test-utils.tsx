import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '@/features/auth/store/authSlice';

// Create a simplified test store without RTK Query APIs
// (we mock the hooks directly in tests)
function createTestStore(preloadedState?: Record<string, unknown>): EnhancedStore {
  const rootReducer = combineReducers({
    auth: authReducer,
  });

  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as never,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Record<string, unknown>;
  store?: EnhancedStore;
  route?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    route = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Mock user data
export const mockActiveUser = {
  id: 'user-1',
  email: 'admin@tekcellent.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  status: 'ACTIVE',
  departmentId: 'dept-1',
  department: { id: 'dept-1', name: 'Engineering' },
  createdAt: new Date().toISOString(),
};

export const mockPendingUser = {
  id: 'user-2',
  email: 'pending@tekcellent.com',
  firstName: 'Pending',
  lastName: 'User',
  role: 'EMPLOYEE',
  status: 'PENDING_APPROVAL',
  departmentId: 'dept-1',
  department: { id: 'dept-1', name: 'Engineering' },
  createdAt: new Date().toISOString(),
};

export const mockInactiveUser = {
  id: 'user-3',
  email: 'inactive@tekcellent.com',
  firstName: 'Inactive',
  lastName: 'User',
  role: 'EMPLOYEE',
  status: 'INACTIVE',
  departmentId: null,
  department: null,
  createdAt: new Date().toISOString(),
};

export const mockDepartments = [
  { id: 'dept-1', name: 'Engineering', code: 'ENG', isActive: true },
  { id: 'dept-2', name: 'Finance', code: 'FIN', isActive: true },
];

// Mock authenticated state
export const mockAuthenticatedState = {
  auth: {
    user: mockActiveUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  },
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
