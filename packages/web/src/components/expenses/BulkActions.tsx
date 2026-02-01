import React from 'react';
import { PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Expense } from '@/features/expenses/services/expenses.service';

export interface BulkActionsProps {
  selectedCount: number;
  selectedItems: Expense[];
  onSubmit?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  selectedItems,
  onSubmit,
  onDelete,
  isLoading = false,
  className,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);

  // Check if all selected items are drafts (only drafts can be submitted/deleted)
  const draftItems = selectedItems.filter((item) => item.status === 'DRAFT');
  const allAreDrafts = draftItems.length === selectedItems.length;
  const canSubmit = draftItems.length > 0;
  const canDelete = draftItems.length > 0;

  const handleSubmitClick = () => {
    if (canSubmit) {
      setShowSubmitConfirm(true);
    }
  };

  const handleDeleteClick = () => {
    if (canDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
    setShowSubmitConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={clsx(
          'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
          'bg-gray-900 text-white rounded-lg shadow-lg px-6 py-3',
          'flex items-center gap-4',
          className
        )}
      >
        {/* Selected Count */}
        <span className="text-sm font-medium">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="h-4 w-px bg-gray-600" />

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={!canSubmit || isLoading}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            canSubmit && !isLoading
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          Submit{' '}
          {!allAreDrafts && draftItems.length > 0 && (
            <span className="text-xs opacity-75">({draftItems.length} drafts)</span>
          )}
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={!canDelete || isLoading}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            canDelete && !isLoading
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          <TrashIcon className="h-4 w-4" />
          Delete{' '}
          {!allAreDrafts && draftItems.length > 0 && (
            <span className="text-xs opacity-75">({draftItems.length} drafts)</span>
          )}
        </button>

        {/* Info message if not all are drafts */}
        {!allAreDrafts && selectedCount > draftItems.length && (
          <span className="text-xs text-gray-400 max-w-xs">
            Only draft expenses can be submitted or deleted
          </span>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Expenses"
        message={
          <div>
            <p className="text-sm text-gray-500">
              Are you sure you want to submit {draftItems.length} expense
              {draftItems.length !== 1 ? 's' : ''} for approval?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Once submitted, these expenses will be sent to the approval workflow.
            </p>
          </div>
        }
        confirmText={isLoading ? 'Submitting...' : 'Submit for Approval'}
        variant="info"
        loading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Expenses"
        message={
          <div>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete {draftItems.length} expense
              {draftItems.length !== 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-red-500 mt-2 font-medium">This action cannot be undone.</p>
          </div>
        }
        confirmText={isLoading ? 'Deleting...' : 'Delete'}
        variant="danger"
        loading={isLoading}
      />
    </>
  );
};

BulkActions.displayName = 'BulkActions';
