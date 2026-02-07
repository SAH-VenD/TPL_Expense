import React from 'react';
import { Bars3Icon, Squares2X2Icon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type ViewType = 'list' | 'grid';

export interface ViewToggleProps {
  value: ViewType;
  onChange: (view: ViewType) => void;
  listLabel?: string;
  gridLabel?: string;
  className?: string;
}

const STORAGE_KEY = 'expenses_view';

export const useViewPreference = (
  defaultView: ViewType = 'list',
): [ViewType, (view: ViewType) => void] => {
  const [view, setView] = React.useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'list' || stored === 'grid') {
        return stored;
      }
    }
    return defaultView;
  });

  const handleViewChange = React.useCallback((newView: ViewType) => {
    setView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newView);
    }
  }, []);

  return [view, handleViewChange];
};

export const ViewToggle: React.FC<ViewToggleProps> = ({
  value,
  onChange,
  listLabel = 'List',
  gridLabel = 'Cards',
  className,
}) => {
  return (
    <div
      className={clsx('inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50', className)}
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          value === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
        )}
        aria-pressed={value === 'list'}
      >
        <Bars3Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{listLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          value === 'grid'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
        )}
        aria-pressed={value === 'grid'}
      >
        <Squares2X2Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{gridLabel}</span>
      </button>
    </div>
  );
};

ViewToggle.displayName = 'ViewToggle';
