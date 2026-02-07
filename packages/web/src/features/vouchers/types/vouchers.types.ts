import type { RoleType } from '@/features/auth/types/auth.types';

export type VoucherStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'OVERDUE';

export interface Voucher {
  id: string;
  voucherNumber: string;
  status: VoucherStatus;
  requesterId: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: {
      id: string;
      name: string;
    };
  };
  currency: string;
  requestedAmount: number;
  approvedAmount?: number;
  disbursedAmount?: number;
  settledAmount?: number;
  purpose: string;
  notes?: string;
  requestedAt: string;
  approvedAt?: string;
  approvedById?: string;
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  disbursedAt?: string;
  disbursedById?: string;
  disbursedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  settlementDeadline?: string;
  settledAt?: string;
  underSpendAmount?: number;
  overSpendAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedExpense {
  id: string;
  expenseNumber: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendor?: string;
  hasReceipt: boolean;
  status: string;
}

export interface VoucherFilters {
  page?: number;
  pageSize?: number;
  status?: VoucherStatus;
  requesterId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CreateVoucherDto {
  requestedAmount: number;
  purpose: string;
  settlementDeadline?: string;
}

export interface UpdateVoucherDto {
  requestedAmount?: number;
  purpose?: string;
  notes?: string;
}

export interface ApproveVoucherDto {
  approvedAmount?: number;
  notes?: string;
}

export interface RejectVoucherDto {
  reason: string;
}

export interface DisburseVoucherDto {
  amount: number;
  paymentMethod?: string;
  paymentReference?: string;
}

export interface SettleVoucherDto {
  notes?: string;
  overspendJustification?: string;
  cashReturnConfirmed?: boolean;
}

export interface VoucherListState {
  selectedStatus: VoucherStatus | 'ALL';
  filters: VoucherFilters & {
    requesterFilter?: string;
    dateRange?: { startDate: string; endDate: string };
    amountRange?: { min: number; max: number };
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}

export interface VoucherStatusBadgeConfig {
  status: VoucherStatus;
  label: string;
  variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export const VOUCHER_STATUS_CONFIG: Record<VoucherStatus, VoucherStatusBadgeConfig> = {
  REQUESTED: {
    status: 'REQUESTED',
    label: 'Pending Approval',
    variant: 'info',
  },
  APPROVED: {
    status: 'APPROVED',
    label: 'Approved',
    variant: 'success',
  },
  REJECTED: {
    status: 'REJECTED',
    label: 'Rejected',
    variant: 'danger',
  },
  DISBURSED: {
    status: 'DISBURSED',
    label: 'Disbursed',
    variant: 'primary',
  },
  PARTIALLY_SETTLED: {
    status: 'PARTIALLY_SETTLED',
    label: 'Partially Settled',
    variant: 'warning',
  },
  SETTLED: {
    status: 'SETTLED',
    label: 'Settled',
    variant: 'success',
  },
  OVERDUE: {
    status: 'OVERDUE',
    label: 'Overdue',
    variant: 'danger',
  },
};

export const VOUCHER_ROUTES = {
  LIST: '/vouchers',
  REQUEST: '/vouchers/request',
  DETAIL: (id: string) => `/vouchers/${id}`,
};

export const VOUCHER_PURPOSE_CATEGORIES = [
  {
    value: 'office-supplies',
    label: 'Office Supplies',
    defaultText: 'Office supplies and stationery',
  },
  { value: 'meals', label: 'Meals & Refreshments', defaultText: 'Team meals and refreshments' },
  {
    value: 'travel',
    label: 'Travel & Transport',
    defaultText: 'Local travel and transport expenses',
  },
  {
    value: 'entertainment',
    label: 'Client Entertainment',
    defaultText: 'Client entertainment and hospitality',
  },
  {
    value: 'maintenance',
    label: 'Facility Maintenance',
    defaultText: 'Facility maintenance and repairs',
  },
  { value: 'other', label: 'Other', defaultText: '' },
] as const;

export type VoucherPurposeCategory = (typeof VOUCHER_PURPOSE_CATEGORIES)[number]['value'];

// Constants
export const MAX_PETTY_CASH_AMOUNT = 50000; // PKR
export const MIN_PURPOSE_LENGTH = 10;
export const MAX_PURPOSE_LENGTH = 1000;
export const DEFAULT_SETTLEMENT_DAYS = 7;

// Helper functions
export const formatAmount = (amount: number, currency = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getDaysUntilDeadline = (deadline: string): number => {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export type VoucherUrgency = 'overdue' | 'due-soon' | 'normal';

export const getVoucherUrgency = (
  status: VoucherStatus,
  settlementDeadline?: string,
): VoucherUrgency => {
  if (status === 'OVERDUE') return 'overdue';
  if (!settlementDeadline) return 'normal';

  const daysUntil = getDaysUntilDeadline(settlementDeadline);
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 3) return 'due-soon';
  return 'normal';
};

export const canUserPerformAction = (
  action: 'edit' | 'delete' | 'approve' | 'reject' | 'disburse' | 'settle',
  userRole: RoleType,
  userId: string,
  voucher: Voucher,
): boolean => {
  const isOwner = voucher.requesterId === userId;
  const isApprover = ['APPROVER', 'FINANCE', 'ADMIN'].includes(userRole);
  const isFinance = ['FINANCE', 'ADMIN'].includes(userRole);

  switch (action) {
    case 'edit':
    case 'delete':
      return isOwner && voucher.status === 'REQUESTED';
    case 'approve':
    case 'reject':
      return isApprover && voucher.status === 'REQUESTED';
    case 'disburse':
      return isFinance && voucher.status === 'APPROVED';
    case 'settle':
      return (
        (isOwner || isFinance) &&
        ['DISBURSED', 'PARTIALLY_SETTLED', 'OVERDUE'].includes(voucher.status)
      );
    default:
      return false;
  }
};

export interface ApprovalHistoryEntry {
  id: string;
  eventType: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'SETTLED';
  timestamp: string;
  userId: string;
  userName: string;
  notes?: string;
}

export interface SettlementBalance {
  disbursedAmount: number;
  totalExpenses: number;
  balance: number;
  balanceType: 'underspend' | 'overspend' | 'zero';
}

export const calculateSettlementBalance = (
  disbursedAmount: number,
  totalExpenses: number,
): SettlementBalance => {
  const balance = disbursedAmount - totalExpenses;
  return {
    disbursedAmount,
    totalExpenses,
    balance,
    balanceType: balance > 0 ? 'underspend' : balance < 0 ? 'overspend' : 'zero',
  };
};
