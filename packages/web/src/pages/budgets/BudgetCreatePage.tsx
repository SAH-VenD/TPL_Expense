import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
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
      <div>
        <Link
          to="/budgets"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Budgets
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create Budget</h1>
        <p className="text-gray-600 mt-1">
          Set up a new budget to track and control spending
        </p>
      </div>

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
