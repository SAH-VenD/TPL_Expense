import { useNavigate } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import {
  PlusIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  TicketIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import clsx from 'clsx';

interface CreateOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  description: string;
}

const createOptions: CreateOption[] = [
  {
    key: 'expense',
    label: 'Expense',
    icon: <CurrencyDollarIcon className="h-5 w-5" />,
    href: '/expenses/new',
    description: 'Submit a new expense for reimbursement',
  },
  {
    key: 'voucher',
    label: 'Voucher',
    icon: <TicketIcon className="h-5 w-5" />,
    href: '/vouchers/request',
    description: 'Request petty cash disbursement',
  },
  {
    key: 'budget',
    label: 'Budget',
    icon: <BanknotesIcon className="h-5 w-5" />,
    href: '/budgets/new',
    description: 'Create a new budget to track spending',
  },
];

export function CreateNewDropdown() {
  const navigate = useNavigate();

  return (
    <Menu as="div" className="relative">
      <MenuButton className="btn btn-primary flex items-center gap-1">
        <PlusIcon className="h-5 w-5" />
        <span className="hidden sm:inline">New</span>
        <ChevronDownIcon className="h-4 w-4" />
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="p-2">
            {createOptions.map((option) => (
              <MenuItem key={option.key}>
                {({ active }) => (
                  <button
                    onClick={() => navigate(option.href)}
                    className={clsx(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left',
                      active ? 'bg-gray-100' : ''
                    )}
                  >
                    <span className="flex-shrink-0 text-primary-600 mt-0.5">
                      {option.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </button>
                )}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
