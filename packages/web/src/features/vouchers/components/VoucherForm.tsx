import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import type { Voucher, CreateVoucherDto } from '../types/vouchers.types';
import {
  MAX_PETTY_CASH_AMOUNT,
  MIN_PURPOSE_LENGTH,
  MAX_PURPOSE_LENGTH,
  VOUCHER_PURPOSE_CATEGORIES,
  formatAmount,
  formatDate,
} from '../types/vouchers.types';
import { addDays, format } from 'date-fns';

// Zod schema for validation
const voucherFormSchema = z.object({
  requestedAmount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Please enter a valid number',
    })
    .min(1, 'Amount must be at least PKR 1')
    .max(MAX_PETTY_CASH_AMOUNT, `Maximum petty cash limit is PKR ${MAX_PETTY_CASH_AMOUNT.toLocaleString()}`),
  purpose: z
    .string()
    .min(MIN_PURPOSE_LENGTH, `Purpose must be at least ${MIN_PURPOSE_LENGTH} characters`)
    .max(MAX_PURPOSE_LENGTH, `Purpose cannot exceed ${MAX_PURPOSE_LENGTH} characters`),
  purposeCategory: z.string().optional(),
  settlementDeadline: z.string().optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

type VoucherFormSchema = z.infer<typeof voucherFormSchema>;

export interface VoucherFormProps {
  initialData?: Partial<CreateVoucherDto>;
  onSubmit: (data: CreateVoucherDto) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  openVouchers?: Voucher[];
  submitLabel?: string;
}

const PURPOSE_CATEGORY_OPTIONS = [
  { value: '', label: 'Select a category (optional)' },
  ...VOUCHER_PURPOSE_CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
  })),
];

// Calculate default settlement deadline (7 days from now)
const getDefaultDeadline = (): string => {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd');
};

// Get min date (today)
const getMinDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

// Get max date (30 days from now)
const getMaxDate = (): string => {
  return format(addDays(new Date(), 30), 'yyyy-MM-dd');
};

export const VoucherForm: React.FC<VoucherFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  openVouchers = [],
  submitLabel = 'Submit Request',
}) => {
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<VoucherFormSchema>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      requestedAmount: initialData?.requestedAmount || undefined,
      purpose: initialData?.purpose || '',
      purposeCategory: '',
      settlementDeadline: getDefaultDeadline(),
      notes: initialData?.notes || '',
    },
    mode: 'onBlur',
  });

  const purposeCategory = watch('purposeCategory');
  const requestedAmount = watch('requestedAmount');

  // Update purpose when category changes
  useEffect(() => {
    if (purposeCategory) {
      const category = VOUCHER_PURPOSE_CATEGORIES.find(
        (cat) => cat.value === purposeCategory
      );
      if (category && category.defaultText) {
        setValue('purpose', category.defaultText, { shouldValidate: true });
      }
    }
  }, [purposeCategory, setValue]);

  const handleFormSubmit = async (data: VoucherFormSchema) => {
    const submitData: CreateVoucherDto = {
      requestedAmount: data.requestedAmount,
      purpose: data.purpose,
      currency: 'PKR',
      notes: data.notes,
      settlementDeadline: data.settlementDeadline,
    };
    await onSubmit(submitData);
  };

  const hasOpenVouchers = openVouchers.length > 0;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Warning for open vouchers */}
      {hasOpenVouchers && (
        <Alert variant="warning" title="You have open vouchers">
          <div className="space-y-1">
            {openVouchers.map((voucher) => (
              <p key={voucher.id}>
                <span className="font-medium">{voucher.voucherNumber}</span> ({formatAmount(voucher.requestedAmount)})
                {voucher.settlementDeadline && (
                  <span> - Due: {formatDate(voucher.settlementDeadline)}</span>
                )}
              </p>
            ))}
            <p className="mt-2 text-sm">
              Please settle your existing vouchers before requesting a new one.
            </p>
          </div>
        </Alert>
      )}

      {/* Amount Field */}
      <div>
        <Controller
          name="requestedAmount"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              label="Requested Amount (PKR)"
              placeholder="Enter amount"
              min={1}
              max={MAX_PETTY_CASH_AMOUNT}
              value={field.value || ''}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : undefined;
                field.onChange(value);
              }}
              error={errors.requestedAmount?.message}
              helperText={`Maximum petty cash limit is PKR ${MAX_PETTY_CASH_AMOUNT.toLocaleString()}`}
            />
          )}
        />
        {requestedAmount && requestedAmount > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            Amount: {formatAmount(requestedAmount)}
          </p>
        )}
      </div>

      {/* Purpose Category (Optional) */}
      <Controller
        name="purposeCategory"
        control={control}
        render={({ field }) => (
          <Select
            label="Purpose Category"
            options={PURPOSE_CATEGORY_OPTIONS}
            value={field.value || ''}
            onChange={field.onChange}
            helperText="Select a category to auto-fill the purpose field"
          />
        )}
      />

      {/* Purpose Field */}
      <Controller
        name="purpose"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            label="Purpose"
            placeholder="e.g., Office supplies, team lunch, facility maintenance..."
            minRows={3}
            maxRows={6}
            maxLength={MAX_PURPOSE_LENGTH}
            showCharCount
            autoResize
            error={errors.purpose?.message}
            helperText={`Describe what the petty cash will be used for (minimum ${MIN_PURPOSE_LENGTH} characters)`}
          />
        )}
      />

      {/* Settlement Deadline */}
      <Controller
        name="settlementDeadline"
        control={control}
        render={({ field }) => (
          <DatePicker
            label="Expected Settlement Date"
            value={field.value}
            onChange={field.onChange}
            minDate={getMinDate()}
            maxDate={getMaxDate()}
            error={errors.settlementDeadline?.message}
            helperText="When do you plan to settle this voucher? (Max 30 days)"
          />
        )}
      />

      {/* Notes (Optional) */}
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            label="Additional Notes (Optional)"
            placeholder="Any additional information..."
            minRows={2}
            maxRows={4}
            maxLength={500}
            showCharCount
            autoResize
            error={errors.notes?.message}
          />
        )}
      />

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              Voucher Request Information
            </h4>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Submitted vouchers will be reviewed by your approver</li>
              <li>Typically approved within 1-2 business days</li>
              <li>After disbursement, you have 7 days to settle with receipts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || isSubmitting || !isValid || hasOpenVouchers}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isLoading || isSubmitting) && <Spinner size="sm" className="mr-2" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

VoucherForm.displayName = 'VoucherForm';
