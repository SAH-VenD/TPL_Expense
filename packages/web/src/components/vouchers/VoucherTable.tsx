import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { Voucher, VoucherStatus } from '@/features/vouchers/types/vouchers.types';
import { VOUCHER_STATUS_CONFIG } from '@/features/vouchers/types/vouchers.types';

interface VoucherTableProps {
  vouchers: Voucher[];
  isLoading: boolean;
  onRowClick: (voucher: Voucher) => void;
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadge(status: VoucherStatus) {
  const config = VOUCHER_STATUS_CONFIG[status];
  if (!config) {
    return <Badge variant="default">{status}</Badge>;
  }
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function VoucherTable({ vouchers, isLoading, onRowClick }: VoucherTableProps) {
  const columns: Column<Voucher>[] = [
    {
      key: 'voucherNumber',
      header: 'Voucher #',
      render: (voucher) => (
        <span className="font-medium text-gray-900">{voucher.voucherNumber}</span>
      ),
    },
    {
      key: 'purpose',
      header: 'Purpose',
      render: (voucher) => (
        <span className="text-gray-700 max-w-xs truncate block" title={voucher.purpose}>
          {voucher.purpose.length > 40 ? `${voucher.purpose.slice(0, 40)}...` : voucher.purpose}
        </span>
      ),
    },
    {
      key: 'requestedAmount',
      header: 'Requested',
      align: 'right',
      render: (voucher) => (
        <span className="text-gray-900">{formatCurrency(voucher.requestedAmount)}</span>
      ),
    },
    {
      key: 'disbursedAmount',
      header: 'Disbursed',
      align: 'right',
      render: (voucher) => (
        <span className="text-gray-700">{formatCurrency(voucher.disbursedAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (voucher) => getStatusBadge(voucher.status),
    },
    {
      key: 'requester',
      header: 'Requester',
      render: (voucher) =>
        voucher.requester
          ? `${voucher.requester.firstName} ${voucher.requester.lastName}`
          : '-',
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (voucher) => (
        <span className="text-gray-500">{formatDate(voucher.createdAt)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={vouchers}
      keyExtractor={(voucher) => voucher.id}
      onRowClick={onRowClick}
      loading={isLoading}
      emptyMessage="No vouchers found"
    />
  );
}

VoucherTable.displayName = 'VoucherTable';
