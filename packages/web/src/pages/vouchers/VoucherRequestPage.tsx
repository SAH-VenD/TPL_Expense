import { useNavigate } from 'react-router-dom';
import { VoucherForm } from '@/features/vouchers/components/VoucherForm';
import {
  useCreateVoucherMutation,
  useGetUserOpenVouchersQuery,
} from '@/features/vouchers/services/vouchers.service';
import type { CreateVoucherDto } from '@/features/vouchers/types/vouchers.types';
import { VOUCHER_ROUTES } from '@/features/vouchers/types/vouchers.types';
import { showToast, PageHeader } from '@/components/ui';

export function VoucherRequestPage() {
  const navigate = useNavigate();
  const [createVoucher, { isLoading }] = useCreateVoucherMutation();
  const { data: openVouchers = [] } = useGetUserOpenVouchersQuery();

  const handleSubmit = async (data: CreateVoucherDto) => {
    try {
      const result = await createVoucher(data).unwrap();
      showToast.success('Voucher request submitted successfully');
      navigate(VOUCHER_ROUTES.DETAIL(result.id));
    } catch (error: any) {
      showToast.error(error?.data?.message || 'Failed to create voucher request');
    }
  };

  const handleCancel = () => {
    navigate(VOUCHER_ROUTES.LIST);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Request Petty Cash"
        subtitle="Submit a request for petty cash disbursement"
        breadcrumbs={[
          { label: 'Vouchers', href: VOUCHER_ROUTES.LIST },
          { label: 'New Request' },
        ]}
        actions={
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        }
      />

      {/* Form Card */}
      <div className="card p-6">
        <VoucherForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          openVouchers={openVouchers}
          submitLabel="Submit Request"
        />
      </div>
    </div>
  );
}

export default VoucherRequestPage;
