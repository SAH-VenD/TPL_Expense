import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import {
  useCreateBudgetMutation,
  type CreateBudgetDto,
} from '@/features/budgets/services/budgets.service';

export const BudgetCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [createBudget, { isLoading }] = useCreateBudgetMutation();

  const handleSubmit = async (data: CreateBudgetDto) => {
    try {
      await createBudget(data).unwrap();
      toast.success('Budget created successfully');
      navigate('/budgets');
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message || 'Failed to create budget'
          : 'Failed to create budget';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate('/budgets');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Create Budget"
        subtitle="Set up a new budget to track and control spending"
        breadcrumbs={[
          { label: 'Budgets', href: '/budgets' },
          { label: 'New Budget' },
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

      {/* Form */}
      <BudgetForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        submitLabel="Create Budget"
      />
    </div>
  );
};

export default BudgetCreatePage;
