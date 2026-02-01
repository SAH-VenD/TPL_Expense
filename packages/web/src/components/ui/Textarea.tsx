import React, { forwardRef, useEffect, useRef } from 'react';
import clsx from 'clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      showCharCount,
      autoResize,
      minRows = 3,
      maxRows = 10,
      className,
      id,
      value,
      maxLength,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const charCount = typeof value === 'string' ? value.length : 0;

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const minHeight = lineHeight * minRows;
        const maxHeight = lineHeight * maxRows;
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      }
    }, [value, autoResize, minRows, maxRows, textareaRef]);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          onChange={onChange}
          rows={minRows}
          className={clsx(
            'input resize-none',
            error && 'input-error',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          {...props}
        />
        <div className="flex justify-between mt-1">
          <div>
            {error && (
              <p id={`${textareaId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={`${textareaId}-helper`} className="text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className={clsx('text-sm', charCount >= maxLength ? 'text-red-600' : 'text-gray-500')}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
