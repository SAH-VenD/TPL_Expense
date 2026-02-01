import toast, { Toaster as HotToaster, ToastOptions } from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// Re-export the Toaster component for use in App.tsx
export const Toaster = HotToaster;

// Custom toast functions with consistent styling
export const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
      ...options,
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
      ...options,
    }),

  warning: (message: string, options?: ToastOptions) =>
    toast(message, {
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
      ...options,
    }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      icon: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
      ...options,
    }),

  loading: (message: string, options?: ToastOptions) => toast.loading(message, options),

  dismiss: (toastId?: string) => toast.dismiss(toastId),

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
    options?: ToastOptions
  ) => toast.promise(promise, messages, options),
};

// Hook for using toast in components
export const useToast = () => showToast;

// Default Toaster configuration
export const ToasterConfig: React.FC = () => (
  <HotToaster
    position="top-right"
    gutter={8}
    toastOptions={{
      duration: 4000,
      style: {
        background: '#fff',
        color: '#374151',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
      },
      success: {
        duration: 3000,
      },
      error: {
        duration: 5000,
      },
    }}
  />
);

ToasterConfig.displayName = 'ToasterConfig';
