import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { useGetDepartmentsQuery, useGetCategoriesQuery } from '@/features/admin/services/admin.service';
import type {
  BudgetType,
  BudgetPeriod,
  BudgetEnforcement,
  CreateBudgetDto,
} from '@/features/budgets/services/budgets.service';

const budgetFormSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must be at most 100 characters'),
    type: z.enum(['DEPARTMENT', 'PROJECT', 'COST_CENTER', 'EMPLOYEE', 'CATEGORY']),
    period: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY', 'PROJECT_BASED']),
    totalAmount: z.number().min(0.01, 'Amount must be greater than 0'),
    currency: z.string().default('PKR'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    warningThreshold: z.number().min(0).max(100).default(75),
    enforcement: z.enum(['HARD_BLOCK', 'SOFT_WARNING', 'AUTO_ESCALATE']).default('SOFT_WARNING'),
    departmentId: z.string().optional(),
    projectId: z.string().optional(),
    costCenterId: z.string().optional(),
    employeeId: z.string().optional(),
    categoryId: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end > start;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export interface BudgetFormProps {
  initialData?: Partial<CreateBudgetDto>;
  isLoading?: boolean;
  onSubmit: (data: CreateBudgetDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const typeOptions = [
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'COST_CENTER', label: 'Cost Center' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'CATEGORY', label: 'Category' },
];

const periodOptions = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'PROJECT_BASED', label: 'Project Based' },
];

const currencyOptions = [
  { value: 'PKR', label: 'PKR - Pakistani Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'AED', label: 'AED - UAE Dirham' },
];

const enforcementOptions = [
  { value: 'SOFT_WARNING', label: 'Soft Warning' },
  { value: 'HARD_BLOCK', label: 'Hard Block' },
  { value: 'AUTO_ESCALATE', label: 'Auto Escalate' },
];

export const BudgetForm: React.FC<BudgetFormProps> = ({
  initialData,
  isLoading,
  onSubmit,
  onCancel,
  submitLabel = 'Save Budget',
}) => {
  const { data: departments } = useGetDepartmentsQuery();
  const { data: categories } = useGetCategoriesQuery();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: (initialData?.type as BudgetType) || 'DEPARTMENT',
      period: (initialData?.period as BudgetPeriod) || 'ANNUAL',
      totalAmount: initialData?.totalAmount || 0,
      currency: initialData?.currency || 'PKR',
      startDate: initialData?.startDate || '',
      endDate: initialData?.endDate || '',
      warningThreshold: initialData?.warningThreshold ?? 75,
      enforcement: (initialData?.enforcement as BudgetEnforcement) || 'SOFT_WARNING',
      departmentId: initialData?.departmentId || undefined,
      projectId: initialData?.projectId || undefined,
      costCenterId: initialData?.costCenterId || undefined,
      employeeId: initialData?.employeeId || undefined,
      categoryId: initialData?.categoryId || undefined,
    },
  });

  const selectedType = watch('type');

  // Clear entity selections when type changes
  useEffect(() => {
    setValue('departmentId', undefined);
    setValue('projectId', undefined);
    setValue('costCenterId', undefined);
    setValue('employeeId', undefined);
    setValue('categoryId', undefined);
  }, [selectedType, setValue]);

  const departmentOptions =
    departments?.map((d) => ({ value: d.id, label: d.name })) || [];
  const categoryOptions =
    categories?.map((c) => ({ value: c.id, label: c.name })) || [];

  const handleFormSubmit = async (data: BudgetFormValues) => {
    await onSubmit(data as CreateBudgetDto);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Budget Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Enter budget name"
            />
          </div>

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label="Budget Type"
                options={typeOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.type?.message}
              />
            )}
          />

          <Controller
            name="period"
            control={control}
            render={({ field }) => (
              <Select
                label="Budget Period"
                options={periodOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.period?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Entity Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assign To
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {selectedType === 'DEPARTMENT' && (
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Department"
                  options={departmentOptions}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select a department"
                  error={errors.departmentId?.message}
                />
              )}
            />
          )}

          {selectedType === 'PROJECT' && (
            <div>
              <Input
                label="Project ID"
                {...register('projectId')}
                error={errors.projectId?.message}
                placeholder="Enter project ID"
                helperText="Project selection will be available when projects are created"
              />
            </div>
          )}

          {selectedType === 'COST_CENTER' && (
            <div>
              <Input
                label="Cost Center ID"
                {...register('costCenterId')}
                error={errors.costCenterId?.message}
                placeholder="Enter cost center ID"
                helperText="Cost center selection will be available when cost centers are created"
              />
            </div>
          )}

          {selectedType === 'EMPLOYEE' && (
            <div>
              <Input
                label="Employee ID"
                {...register('employeeId')}
                error={errors.employeeId?.message}
                placeholder="Enter employee ID"
                helperText="Employee selection will be available from user list"
              />
            </div>
          )}

          {selectedType === 'CATEGORY' && (
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Category"
                  options={categoryOptions}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select a category"
                  error={errors.categoryId?.message}
                />
              )}
            />
          )}
        </div>
      </div>

      {/* Financial Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Financial Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Total Amount"
              type="number"
              step="0.01"
              min="0"
              {...register('totalAmount', { valueAsNumber: true })}
              error={errors.totalAmount?.message}
              placeholder="Enter budget amount"
            />
          </div>

          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                label="Currency"
                options={currencyOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.currency?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Period Dates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Budget Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start Date"
                value={field.value}
                onChange={field.onChange}
                error={errors.startDate?.message}
              />
            )}
          />

          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End Date"
                value={field.value}
                onChange={field.onChange}
                error={errors.endDate?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Alert Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Warning Threshold (%)"
              type="number"
              min="0"
              max="100"
              {...register('warningThreshold', { valueAsNumber: true })}
              error={errors.warningThreshold?.message}
              helperText="Percentage of budget to trigger warning alert"
            />
          </div>

          <Controller
            name="enforcement"
            control={control}
            render={({ field }) => (
              <Select
                label="Enforcement Level"
                options={enforcementOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.enforcement?.message}
                helperText="Action when budget threshold is exceeded"
              />
            )}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

BudgetForm.displayName = 'BudgetForm';
