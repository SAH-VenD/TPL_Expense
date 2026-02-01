import React from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
  selectedIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultIndex = 0,
  selectedIndex,
  onChange,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: {
      list: 'border-b border-gray-200',
      tab: (selected: boolean) =>
        clsx(
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none',
          selected
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        ),
    },
    pills: {
      list: 'bg-gray-100 p-1 rounded-lg',
      tab: (selected: boolean) =>
        clsx(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none',
          selected
            ? 'bg-white text-gray-900 shadow'
            : 'text-gray-500 hover:text-gray-700'
        ),
    },
    underline: {
      list: '',
      tab: (selected: boolean) =>
        clsx(
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none',
          selected
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        ),
    },
  };

  const styles = variantStyles[variant];

  return (
    <TabGroup
      defaultIndex={defaultIndex}
      selectedIndex={selectedIndex}
      onChange={onChange}
      className={className}
    >
      <TabList className={clsx('flex space-x-1', styles.list)}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            disabled={tab.disabled}
            className={({ selected }) =>
              clsx(
                styles.tab(selected),
                tab.disabled && 'opacity-50 cursor-not-allowed',
                'flex items-center'
              )
            }
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="mt-4">
        {tabs.map((tab) => (
          <TabPanel key={tab.key} className="focus:outline-none">
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
};

Tabs.displayName = 'Tabs';
