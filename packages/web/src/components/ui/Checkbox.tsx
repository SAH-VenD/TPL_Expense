import React, { forwardRef, useEffect, useRef } from 'react';
import clsx from 'clsx';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, error, className, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const internalRef = useRef<HTMLInputElement>(null);
    const checkboxRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

    useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate, checkboxRef]);

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={checkboxRef}
            id={checkboxId}
            type="checkbox"
            className={clsx(
              'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500',
              className,
            )}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className={clsx(
              'ml-2 text-sm',
              props.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer',
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
