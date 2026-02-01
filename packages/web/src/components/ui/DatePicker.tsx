import React, { forwardRef } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label?: string;
  value?: string | Date;
  onChange: (date: string) => void;
  error?: string;
  helperText?: string;
  minDate?: string | Date;
  maxDate?: string | Date;
  displayFormat?: string;
}

const toDateInputValue = (value: string | Date | undefined): string => {
  if (!value) return '';
  if (value instanceof Date) {
    return isValid(value) ? format(value, 'yyyy-MM-dd') : '';
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : value;
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      helperText,
      minDate,
      maxDate,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const inputValue = toDateInputValue(value);
    const minValue = toDateInputValue(minDate);
    const maxValue = toDateInputValue(maxDate);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <CalendarIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            ref={ref}
            id={inputId}
            type="date"
            value={inputValue}
            onChange={handleChange}
            min={minValue}
            max={maxValue}
            disabled={disabled}
            className={clsx(
              'input pl-10',
              error && 'input-error',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
