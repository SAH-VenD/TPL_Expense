import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  homeHref = '/',
  className,
}) => {
  const allItems = showHome
    ? [{ label: 'Home', href: homeHref, icon: <HomeIcon className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className={clsx(
                    'flex items-center text-sm',
                    isLast ? 'font-medium text-gray-900' : 'text-gray-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumb.displayName = 'Breadcrumb';
