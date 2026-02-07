import React from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled,
  error,
  helperText,
  className,
  id,
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <Listbox value={value || ''} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <ListboxButton
            id={selectId}
            className={clsx(
              'input text-left flex items-center justify-between cursor-pointer',
              error && 'input-error',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className={clsx(!selectedOption && 'text-gray-400')}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </ListboxButton>

          <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={({ active, selected, disabled }) =>
                  clsx(
                    'relative cursor-pointer select-none py-2 pl-10 pr-4',
                    active && 'bg-primary-50 text-primary-900',
                    selected && 'bg-primary-100',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className={clsx('block truncate', selected && 'font-medium')}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};

Select.displayName = 'Select';
