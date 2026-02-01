import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Card, Skeleton, Alert, Modal, ConfirmDialog } from '@/components/ui';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import {
  useGetBudgetQuery,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  type CreateBudgetDto,
} from '@/features/budgets/services/budgets.service';

const formatCurrency = (amount: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getUtilizationColor = (utilization: number): string => {
  if (utilization >= 90) return 'bg-red-500';
  if (utilization >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getUtilizationTextColor = (utilization: number): string => {
  if (utilization >= 90) return 'text-red-600';
  if (utilization >= 70) return 'text-yellow-600';
  return 'text-green-600';
};

export const BudgetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: budget, isLoading, isError, refetch } = useGetBudgetQuery(id!);
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation();

  const handleUpdate = async (data: CreateBudgetDto) => {
    try {
      await updateBudget({ id: id!, data }).unwrap();
      toast.success('Budget updated successfully');
      setIsEditModalOpen(false);
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message || 'Failed to update budget'
          : 'Failed to update budget';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBudget(id!).unwrap();
      toast.success('Budget deleted successfully');
      navigate('/budgets');
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message || 'Failed to delete budget'
          : 'Failed to delete budget';
      toast.error(errorMessage);
      setIsDeleteDialogOpen(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton height={20} width={120} />
          <Skeleton height={32} width={200} className="mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="space-y-4">
                <Skeleton height={24} width="40%" />
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i}>
                      <Skeleton height={16} width="60%" />
                      <Skeleton height={20} width="80%" className="mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card>
              <Skeleton height={24} width="30%" />
              <Skeleton height={80} className="mt-4" />
            </Card>
          </div>
          <div>
            <Card>
              <Skeleton height={24} width="40%" />
              <div className="space-y-3 mt-4">
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !budget) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            to="/budgets"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Budgets
          </Link>
        </div>
        <Alert variant="error" title="Failed to load budget">
          <p className="mt-1">
            We could not retrieve the budget details. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center text-sm font-medium text-red-700 hover:text-red-800"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  const utilization =
    budget.totalAmount > 0 ? (budget.usedAmount / budget.totalAmount) * 100 : 0;
  const cappedUtilization = Math.min(utilization, 100);
  const remainingAmount = budget.totalAmount - budget.usedAmount;

  // Prepare initial data for edit form
  const editInitialData: Partial<CreateBudgetDto> = {
    name: budget.name,
    type: budget.type,
    period: budget.period,
    totalAmount: budget.totalAmount,
    currency: budget.currency,
    startDate: budget.startDate.split('T')[0],
    endDate: budget.endDate.split('T')[0],
    warningThreshold: budget.warningThreshold,
    enforcement: budget.enforcement,
    departmentId: budget.departmentId,
    projectId: budget.projectId,
    categoryId: budget.categoryId,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link
            to="/budgets"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Budgets
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{budget.name}</h1>
          <p className="text-gray-500 mt-1 capitalize">
            {budget.type.toLowerCase().replace('_', ' ')} Budget -{' '}
            {budget.period.toLowerCase().replace('_', ' ')}
          </p>
        </div>
        <span
          className={clsx(
            'px-3 py-1 text-sm font-medium rounded-full',
            budget.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          )}
        >
          {budget.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Details */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Budget Details
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">
                  {budget.type.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Period</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">
                  {budget.period.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Start Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(budget.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">End Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(budget.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Warning Threshold</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {budget.warningThreshold}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Enforcement</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">
                  {budget.enforcement.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
              {budget.department && (
                <div>
                  <dt className="text-sm text-gray-500">Department</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {budget.department.name}
                  </dd>
                </div>
              )}
              {budget.project && (
                <div>
                  <dt className="text-sm text-gray-500">Project</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {budget.project.name}
                  </dd>
                </div>
              )}
              {budget.category && (
                <div>
                  <dt className="text-sm text-gray-500">Category</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {budget.category.name}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Financial Summary & Utilization */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Financial Summary
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(budget.totalAmount, budget.currency)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Used</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(budget.usedAmount, budget.currency)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p
                    className={clsx(
                      'text-xl font-semibold',
                      remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(remainingAmount, budget.currency)}
                  </p>
                </div>
              </div>

              {/* Utilization Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Budget Utilization
                  </span>
                  <span
                    className={clsx(
                      'text-sm font-semibold',
                      getUtilizationTextColor(utilization)
                    )}
                  >
                    {utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      getUtilizationColor(utilization)
                    )}
                    style={{ width: `${cappedUtilization}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span
                    className={clsx(
                      utilization >= budget.warningThreshold && 'text-yellow-600 font-medium'
                    )}
                  >
                    Warning: {budget.warningThreshold}%
                  </span>
                  <span>100%</span>
                </div>
              </div>

              {/* Warning/Exceeded alerts */}
              {utilization >= 100 && (
                <Alert variant="error" title="Budget Exceeded">
                  This budget has exceeded its allocated amount by{' '}
                  {formatCurrency(Math.abs(remainingAmount), budget.currency)}.
                </Alert>
              )}
              {utilization >= budget.warningThreshold && utilization < 100 && (
                <Alert variant="warning" title="Budget Warning">
                  This budget has reached {utilization.toFixed(1)}% utilization,
                  exceeding the warning threshold of {budget.warningThreshold}%.
                </Alert>
              )}
            </div>
          </Card>

          {/* Timestamps */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Record Information
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(budget.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Last Updated</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(budget.updatedAt)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Budget
              </button>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Budget
              </button>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Stats
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Daily Average</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(
                    budget.totalAmount /
                      Math.max(
                        1,
                        Math.ceil(
                          (new Date(budget.endDate).getTime() -
                            new Date(budget.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      ),
                    budget.currency
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Days Remaining</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(budget.endDate).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Currency</span>
                <span className="text-sm font-medium text-gray-900">
                  {budget.currency}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Budget"
        size="full"
      >
        <BudgetForm
          initialData={editInitialData}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={isUpdating}
          submitLabel="Update Budget"
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Budget"
        message={`Are you sure you want to delete "${budget.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default BudgetDetailPage;
