import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { VoucherForm } from '@/features/vouchers/components/VoucherForm';
import {
  useCreateVoucherMutation,
  useGetUserOpenVouchersQuery,
} from '@/features/vouchers/services/vouchers.service';
import type { CreateVoucherDto } from '@/features/vouchers/types/vouchers.types';
import { VOUCHER_ROUTES } from '@/features/vouchers/types/vouchers.types';
import { showToast } from '@/components/ui';

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
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Petty Cash</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit a request for petty cash disbursement
          </p>
        </div>
      </div>

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
