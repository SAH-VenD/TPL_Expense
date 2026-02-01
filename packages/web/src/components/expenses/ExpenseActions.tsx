import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dropdown } from '../ui/Dropdown';
import type { Expense, ExpenseStatus } from '@/features/expenses/services/expenses.service';

export interface ExpenseActionsProps {
  expense: Expense;
  currentUserId?: string;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onWithdraw?: () => Promise<void>;
  onClone?: () => void;
  onResubmit?: () => Promise<void>;
  isLoading?: boolean;
  layout?: 'horizontal' | 'dropdown';
  className?: string;
}

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const getActionsForStatus = (
  status: ExpenseStatus,
  handlers: {
    onEdit?: () => void;
    onDelete?: () => void;
    onSubmit?: () => void;
    onWithdraw?: () => void;
    onClone?: () => void;
    onResubmit?: () => Promise<void>;
  },
  isLoading: boolean
): { primary: ActionButton[]; secondary: ActionButton[] } => {
  const actions: { primary: ActionButton[]; secondary: ActionButton[] } = {
    primary: [],
    secondary: [],
  };

  switch (status) {
    case 'DRAFT':
      if (handlers.onSubmit) {
        actions.primary.push({
          label: 'Submit for Approval',
          icon: <PaperAirplaneIcon className="h-4 w-4" />,
          onClick: handlers.onSubmit,
          variant: 'primary',
          disabled: isLoading,
        });
      }
      if (handlers.onEdit) {
        actions.secondary.push({
          label: 'Edit',
          icon: <PencilIcon className="h-4 w-4" />,
          onClick: handlers.onEdit,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      if (handlers.onDelete) {
        actions.secondary.push({
          label: 'Delete',
          icon: <TrashIcon className="h-4 w-4" />,
          onClick: () => handlers.onDelete?.(),
          variant: 'danger',
          disabled: isLoading,
        });
      }
      break;

    case 'SUBMITTED':
    case 'PENDING_APPROVAL':
      if (handlers.onWithdraw) {
        actions.primary.push({
          label: 'Withdraw',
          icon: <ArrowUturnLeftIcon className="h-4 w-4" />,
          onClick: handlers.onWithdraw,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      if (handlers.onEdit) {
        actions.secondary.push({
          label: 'Edit Details',
          icon: <PencilIcon className="h-4 w-4" />,
          onClick: handlers.onEdit,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      break;

    case 'APPROVED':
      if (handlers.onClone) {
        actions.secondary.push({
          label: 'Clone',
          icon: <DocumentDuplicateIcon className="h-4 w-4" />,
          onClick: handlers.onClone,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      if (handlers.onEdit) {
        actions.secondary.push({
          label: 'View Details',
          icon: <EyeIcon className="h-4 w-4" />,
          onClick: handlers.onEdit,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      break;

    case 'REJECTED':
    case 'CLARIFICATION_REQUESTED':
      if (handlers.onResubmit) {
        actions.primary.push({
          label: 'Resubmit',
          icon: <PaperAirplaneIcon className="h-4 w-4" />,
          onClick: handlers.onResubmit,
          variant: 'primary',
          disabled: isLoading,
        });
      }
      if (handlers.onEdit) {
        actions.secondary.push({
          label: 'Edit',
          icon: <PencilIcon className="h-4 w-4" />,
          onClick: handlers.onEdit,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      if (handlers.onDelete && status === 'REJECTED') {
        actions.secondary.push({
          label: 'Delete',
          icon: <TrashIcon className="h-4 w-4" />,
          onClick: () => handlers.onDelete?.(),
          variant: 'danger',
          disabled: isLoading,
        });
      }
      break;

    case 'RESUBMITTED':
      if (handlers.onWithdraw) {
        actions.primary.push({
          label: 'Withdraw',
          icon: <ArrowUturnLeftIcon className="h-4 w-4" />,
          onClick: handlers.onWithdraw,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      if (handlers.onEdit) {
        actions.secondary.push({
          label: 'Edit Details',
          icon: <PencilIcon className="h-4 w-4" />,
          onClick: handlers.onEdit,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      break;

    case 'PAID':
      if (handlers.onClone) {
        actions.secondary.push({
          label: 'Clone',
          icon: <DocumentDuplicateIcon className="h-4 w-4" />,
          onClick: handlers.onClone,
          variant: 'secondary',
          disabled: isLoading,
        });
      }
      break;
  }

  return actions;
};

const variantStyles: Record<string, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-white border border-red-300 text-red-700 hover:bg-red-50',
};

export const ExpenseActions: React.FC<ExpenseActionsProps> = ({
  expense,
  currentUserId,
  onEdit,
  onDelete,
  onSubmit,
  onWithdraw,
  onClone,
  onResubmit,
  isLoading = false,
  layout = 'horizontal',
  className,
}) => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false);

  // Check if current user is the owner
  const isOwner = !currentUserId || expense.submitterId === currentUserId;

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      navigate(`/expenses/${expense.id}/edit`);
    }
  };

  const handleClone = () => {
    if (onClone) {
      onClone();
    } else {
      // Navigate to create page with cloned data
      navigate('/expenses/new', { state: { cloneFrom: expense } });
    }
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleWithdrawClick = () => {
    setShowWithdrawConfirm(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
    setShowSubmitConfirm(false);
  };

  const handleConfirmWithdraw = async () => {
    if (onWithdraw) {
      await onWithdraw();
    }
    setShowWithdrawConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
    setShowDeleteConfirm(false);
  };

  const { primary, secondary } = getActionsForStatus(
    expense.status,
    {
      onEdit: handleEdit,
      onDelete: handleDeleteClick,
      onSubmit: handleSubmitClick,
      onWithdraw: handleWithdrawClick,
      onClone: handleClone,
      onResubmit: onResubmit,
    },
    isLoading
  );

  // If not owner, only show view/clone actions
  const filteredSecondary = isOwner
    ? secondary
    : secondary.filter((a) => a.label === 'View Details' || a.label === 'Clone');
  const filteredPrimary = isOwner ? primary : [];

  const allActions = [...filteredPrimary, ...filteredSecondary];

  if (allActions.length === 0) {
    return null;
  }

  if (layout === 'dropdown') {
    const dropdownItems = allActions.map((action, idx) => ({
      key: `action-${idx}`,
      label: action.label,
      icon: action.icon,
      onClick: action.onClick,
      disabled: action.disabled,
      danger: action.variant === 'danger',
    }));

    return (
      <>
        <Dropdown
          trigger={
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Actions
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          }
          items={dropdownItems}
          className={className}
        />
        {renderDialogs()}
      </>
    );
  }

  function renderDialogs() {
    return (
      <>
        <ConfirmDialog
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          onConfirm={handleConfirmSubmit}
          title="Submit Expense"
          message="Are you sure you want to submit this expense for approval? It will be sent to the approval workflow."
          confirmText={isLoading ? 'Submitting...' : 'Submit'}
          variant="info"
          loading={isLoading}
        />

        <ConfirmDialog
          isOpen={showWithdrawConfirm}
          onClose={() => setShowWithdrawConfirm(false)}
          onConfirm={handleConfirmWithdraw}
          title="Withdraw Expense"
          message="Are you sure you want to withdraw this expense? It will be moved back to draft status."
          confirmText={isLoading ? 'Withdrawing...' : 'Withdraw'}
          variant="warning"
          loading={isLoading}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Expense"
          message="Are you sure you want to delete this expense? This action cannot be undone."
          confirmText={isLoading ? 'Deleting...' : 'Delete'}
          variant="danger"
          loading={isLoading}
        />
      </>
    );
  }

  return (
    <>
      <div className={clsx('flex flex-wrap gap-3', className)}>
        {filteredPrimary.map((action, index) => (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              variantStyles[action.variant]
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        {filteredSecondary.map((action, index) => (
          <button
            key={`secondary-${index}`}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              variantStyles[action.variant]
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
      {renderDialogs()}
    </>
  );
};

ExpenseActions.displayName = 'ExpenseActions';
