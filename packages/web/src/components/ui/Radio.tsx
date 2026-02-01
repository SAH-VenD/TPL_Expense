import React, { forwardRef, createContext, useContext } from 'react';
import clsx from 'clsx';

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  disabled,
  children,
  className,
  orientation = 'vertical',
}) => {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled }}>
      <div
        role="radiogroup"
        className={clsx(
          orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2',
          className
        )}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  value: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, value, className, id, disabled: propDisabled, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    const radioId = id || `radio-${value}`;

    const name = context?.name || props.name;
    const checked = context ? context.value === value : props.checked;
    const disabled = propDisabled || context?.disabled;

    const handleChange = () => {
      if (context) {
        context.onChange(value);
      }
    };

    return (
      <div className="flex items-center">
        <input
          ref={ref}
          id={radioId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className={clsx(
            'h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={radioId}
            className={clsx(
              'ml-2 text-sm',
              disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
