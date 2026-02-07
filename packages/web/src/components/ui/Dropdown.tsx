import React, { Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  return (
    <Menu as="div" className={clsx('relative inline-block text-left', className)}>
      <MenuButton as={Fragment}>{trigger}</MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className={clsx(
            'absolute z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          )}
        >
          <div className="py-1">
            {items.map((item) => (
              <MenuItem key={item.key} disabled={item.disabled}>
                {({ active, disabled }) => {
                  const baseClasses = clsx(
                    'flex w-full items-center px-4 py-2 text-sm',
                    active && !disabled && 'bg-gray-100',
                    disabled && 'opacity-50 cursor-not-allowed',
                    item.danger ? 'text-red-600' : 'text-gray-700',
                  );

                  if (item.href) {
                    return (
                      <a href={item.href} className={baseClasses}>
                        {item.icon && <span className="mr-3 h-5 w-5">{item.icon}</span>}
                        {item.label}
                      </a>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={item.onClick}
                      disabled={disabled}
                      className={baseClasses}
                    >
                      {item.icon && <span className="mr-3 h-5 w-5">{item.icon}</span>}
                      {item.label}
                    </button>
                  );
                }}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
};

// Convenience component for a standard dropdown button
export const DropdownButton: React.FC<{
  label: string;
  items: DropdownItem[];
  variant?: 'primary' | 'secondary';
  className?: string;
}> = ({ label, items, variant = 'secondary', className }) => {
  return (
    <Dropdown
      trigger={
        <button
          className={clsx(
            'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
            variant === 'primary'
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
            className,
          )}
        >
          {label}
          <ChevronDownIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
        </button>
      }
      items={items}
    />
  );
};

Dropdown.displayName = 'Dropdown';
DropdownButton.displayName = 'DropdownButton';
