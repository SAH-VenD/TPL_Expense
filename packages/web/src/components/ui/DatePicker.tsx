import React, { forwardRef, useRef, useImperativeHandle } from 'react';
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
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const inputValue = toDateInputValue(value);
    const minValue = toDateInputValue(minDate);
    const maxValue = toDateInputValue(maxDate);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleIconClick = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.showPicker?.();
        inputRef.current.focus();
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={handleIconClick}
            disabled={disabled}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none disabled:cursor-not-allowed"
            tabIndex={-1}
            aria-label="Open date picker"
          >
            <CalendarIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            ref={inputRef}
            id={inputId}
            type="date"
            value={inputValue}
            onChange={handleChange}
            min={minValue}
            max={maxValue}
            disabled={disabled}
            className={clsx(
              'input pl-10',
              '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
              '[&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden',
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
