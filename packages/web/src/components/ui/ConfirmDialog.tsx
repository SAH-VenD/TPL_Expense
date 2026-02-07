import React from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Modal } from './Modal';
import clsx from 'clsx';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const variantConfig: Record<ConfirmDialogVariant, { icon: React.ReactNode; buttonClass: string }> =
  {
    danger: {
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />,
      buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />,
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
    info: {
      icon: <InformationCircleIcon className="h-6 w-6 text-blue-600" />,
      buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
    primary: {
      icon: <CheckCircleIcon className="h-6 w-6 text-primary-600" />,
      buttonClass: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    },
  };

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading,
  isLoading,
  children,
}) => {
  const config = variantConfig[variant];
  const isProcessing = loading || isLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="sm:flex sm:items-start">
        <div
          className={clsx(
            'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10',
            variant === 'danger' && 'bg-red-100',
            variant === 'warning' && 'bg-yellow-100',
            variant === 'info' && 'bg-blue-100',
            variant === 'primary' && 'bg-primary-100',
          )}
        >
          {config.icon}
        </div>
        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="mt-2">
            {typeof message === 'string' ? (
              <p className="text-sm text-gray-500">{message}</p>
            ) : (
              message
            )}
            {children}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className={clsx(
            'px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50',
            config.buttonClass,
          )}
        >
          {isProcessing ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';
