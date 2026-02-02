import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { useGetBudgetsQuery } from '@/features/budgets/services/budgets.service';
import type { Budget, BudgetUtilization } from '@/features/budgets/services/budgets.service';

export interface BudgetTransferData {
  sourceBudgetId: string;
  targetBudgetId: string;
  amount: number;
  reason?: string;
}

export interface BudgetTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBudget: Budget;
  sourceUtilization?: BudgetUtilization;
  onTransfer: (data: BudgetTransferData) => Promise<void>;
}

const formatCurrency = (amount: number, currency: string = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const BudgetTransferModal: React.FC<BudgetTransferModalProps> = ({
  isOpen,
  onClose,
  sourceBudget,
  sourceUtilization,
  onTransfer,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceUsedAmount = sourceUtilization
    ? sourceUtilization.committed + sourceUtilization.spent
    : 0;
  const availableToTransfer = sourceUtilization?.available ?? sourceBudget.totalAmount;

  const transferSchema = z.object({
    targetBudgetId: z.string().min(1, 'Please select a target budget'),
    amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(
        availableToTransfer,
        `Amount cannot exceed ${formatCurrency(availableToTransfer, sourceBudget.currency)}`
      ),
    reason: z.string().max(500, 'Reason must be at most 500 characters').optional(),
  });

  type TransferFormValues = z.infer<typeof transferSchema>;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      targetBudgetId: '',
      amount: 0,
      reason: '',
    },
  });

  // Fetch budgets of the same type for transfer
  const { data: budgetsResponse } = useGetBudgetsQuery({
    type: sourceBudget.type,
    activeOnly: true,
    pageSize: 100,
  });

  const eligibleBudgets = useMemo(() => {
    if (!budgetsResponse?.data) return [];
    return budgetsResponse.data.filter((b) => b.id !== sourceBudget.id);
  }, [budgetsResponse, sourceBudget.id]);

  const targetBudgetOptions = eligibleBudgets.map((budget) => ({
    value: budget.id,
    label: `${budget.name} (Total: ${formatCurrency(budget.totalAmount, budget.currency)})`,
  }));

  const watchedTargetId = watch('targetBudgetId');
  const watchedAmount = watch('amount');

  const targetBudget = eligibleBudgets.find((b) => b.id === watchedTargetId);

  const handleFormSubmit = async (data: TransferFormValues) => {
    setIsSubmitting(true);
    try {
      await onTransfer({
        sourceBudgetId: sourceBudget.id,
        targetBudgetId: data.targetBudgetId,
        amount: data.amount,
        reason: data.reason,
      });
      reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Calculate preview values
  const sourceAfterTransfer = availableToTransfer - (watchedAmount || 0);
  const targetNewTotal = targetBudget
    ? targetBudget.totalAmount + (watchedAmount || 0)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer Budget Allocation"
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <ModalBody className="space-y-6">
          {/* Source Budget Info */}
          <Card className="bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Source Budget
            </h4>
            <p className="text-lg font-semibold text-gray-900">
              {sourceBudget.name}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Allocated</p>
                <p className="font-medium">
                  {formatCurrency(sourceBudget.totalAmount, sourceBudget.currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Used</p>
                <p className="font-medium">
                  {formatCurrency(sourceUsedAmount, sourceBudget.currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Available to Transfer</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(availableToTransfer, sourceBudget.currency)}
                </p>
              </div>
            </div>
          </Card>

          {/* Target Budget Selection */}
          <div>
            <Controller
              name="targetBudgetId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Target Budget"
                  options={targetBudgetOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select target budget"
                  error={errors.targetBudgetId?.message}
                  disabled={eligibleBudgets.length === 0}
                  helperText={
                    eligibleBudgets.length === 0
                      ? `No other ${sourceBudget.type.toLowerCase().replace('_', ' ')} budgets available`
                      : undefined
                  }
                />
              )}
            />
          </div>

          {/* Transfer Amount */}
          <div>
            <Input
              label="Transfer Amount"
              type="number"
              step="0.01"
              min="0.01"
              max={availableToTransfer}
              {...register('amount', { valueAsNumber: true })}
              error={errors.amount?.message}
              helperText={`Maximum: ${formatCurrency(availableToTransfer, sourceBudget.currency)}`}
            />
          </div>

          {/* Reason */}
          <div>
            <Textarea
              label="Reason for Transfer (Optional)"
              {...register('reason')}
              error={errors.reason?.message}
              placeholder="Enter reason for this budget transfer"
              rows={3}
            />
          </div>

          {/* Preview Section */}
          {targetBudget && watchedAmount > 0 && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3">
                Transfer Preview
              </h4>
              <div className="flex items-center gap-4">
                {/* Source Preview */}
                <div className="flex-1 text-center">
                  <p className="text-xs text-blue-700 mb-1">Source</p>
                  <p className="text-sm font-medium text-gray-900">
                    {sourceBudget.name}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(availableToTransfer, sourceBudget.currency)}
                  </p>
                  <p className="text-sm text-red-600">
                    - {formatCurrency(watchedAmount, sourceBudget.currency)}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1 border-t pt-1">
                    = {formatCurrency(sourceAfterTransfer, sourceBudget.currency)}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ArrowRightIcon className="h-6 w-6 text-blue-500" />
                </div>

                {/* Target Preview */}
                <div className="flex-1 text-center">
                  <p className="text-xs text-blue-700 mb-1">Target</p>
                  <p className="text-sm font-medium text-gray-900">
                    {targetBudget.name}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(targetBudget.totalAmount, targetBudget.currency)}
                  </p>
                  <p className="text-sm text-green-600">
                    + {formatCurrency(watchedAmount, targetBudget.currency)}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1 border-t pt-1">
                    = {formatCurrency(targetNewTotal, targetBudget.currency)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || eligibleBudgets.length === 0}
          >
            {isSubmitting ? 'Transferring...' : 'Transfer'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

BudgetTransferModal.displayName = 'BudgetTransferModal';
