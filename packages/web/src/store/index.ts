import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from '../features/auth/store/authSlice';
import { authApi } from '../features/auth/services/auth.service';
import { expensesApi } from '../features/expenses/services/expenses.service';
import { approvalsApi } from '../features/approvals/services/approvals.service';
import { vouchersApi } from '../features/vouchers/services/vouchers.service';
import { budgetsApi } from '../features/budgets/services/budgets.service';
import { reportsApi } from '../features/reports/services/reports.service';
import { adminApi } from '../features/admin/services/admin.service';
import { notificationsApi } from '../features/notifications/services/notifications.service';
import { preApprovalsApi } from '../features/pre-approvals/services/pre-approvals.service';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [expensesApi.reducerPath]: expensesApi.reducer,
    [approvalsApi.reducerPath]: approvalsApi.reducer,
    [vouchersApi.reducerPath]: vouchersApi.reducer,
    [budgetsApi.reducerPath]: budgetsApi.reducer,
    [reportsApi.reducerPath]: reportsApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [preApprovalsApi.reducerPath]: preApprovalsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      expensesApi.middleware,
      approvalsApi.middleware,
      vouchersApi.middleware,
      budgetsApi.middleware,
      reportsApi.middleware,
      adminApi.middleware,
      notificationsApi.middleware,
      preApprovalsApi.middleware,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
