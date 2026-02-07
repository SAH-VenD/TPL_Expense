import React, { useState } from 'react';
import { ChevronRightIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

export interface TreeAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (node: T) => void;
  variant?: 'default' | 'danger';
  disabled?: (node: T) => boolean;
}

export interface TreeNodeProps<T> {
  node: T;
  level: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  renderNode: (node: T, isExpanded: boolean) => React.ReactNode;
  actionMenuItems?: TreeAction<T>[];
  onClick?: (node: T) => void;
  hasChildren: boolean;
  isHighlighted?: boolean;
  isDraggable?: boolean;
}

export function TreeNode<T extends { id: string }>({
  node,
  level,
  isExpanded,
  onToggleExpand,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  renderNode,
  actionMenuItems,
  onClick,
  hasChildren,
  isHighlighted = false,
  isDraggable = false,
}: TreeNodeProps<T>) {
  const [showActions, setShowActions] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (hasChildren) {
          onToggleExpand();
        } else if (onClick) {
          onClick(node);
        }
        break;
      case 'ArrowRight':
        if (hasChildren && !isExpanded) {
          e.preventDefault();
          onToggleExpand();
        }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded) {
          e.preventDefault();
          onToggleExpand();
        }
        break;
    }
  };

  const dropdownItems: DropdownItem[] = (actionMenuItems || []).map((action) => ({
    key: action.id,
    label: action.label,
    icon: action.icon,
    onClick: () => action.onClick(node),
    disabled: action.disabled?.(node),
    danger: action.variant === 'danger',
  }));

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={false}
      aria-level={level + 1}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={clsx(
        'flex items-center py-2 px-3 rounded-lg transition-colors cursor-pointer group',
        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
        isDragging && 'opacity-50 bg-gray-100',
        isDragOver && 'bg-primary-50 border-2 border-dashed border-primary-400',
        isHighlighted && 'bg-yellow-50 ring-2 ring-yellow-400',
      )}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) {
          onClick(node);
        }
      }}
    >
      {/* Expand/Collapse button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) {
            onToggleExpand();
          }
        }}
        className={clsx(
          'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded',
          hasChildren ? 'hover:bg-gray-200' : 'invisible',
        )}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <ChevronRightIcon
          className={clsx(
            'h-4 w-4 text-gray-500 transition-transform duration-200',
            isExpanded && 'rotate-90',
          )}
        />
      </button>

      {/* Drag handle */}
      {isDraggable && (
        <div className="flex-shrink-0 w-4 h-4 mr-2 cursor-grab opacity-0 group-hover:opacity-100">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 4h2v2H4V4zm0 3h2v2H4V7zm0 3h2v2H4v-2zm3-6h2v2H7V4zm0 3h2v2H7V7zm0 3h2v2H7v-2z" />
          </svg>
        </div>
      )}

      {/* Node content */}
      <div className="flex-1 min-w-0">{renderNode(node, isExpanded)}</div>

      {/* Actions menu */}
      {actionMenuItems && actionMenuItems.length > 0 && (
        <span
          className={clsx(
            'flex-shrink-0 ml-2 transition-opacity',
            showActions ? 'opacity-100' : 'opacity-0',
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Dropdown
            trigger={
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Actions"
              >
                <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
              </button>
            }
            items={dropdownItems}
            align="right"
          />
        </span>
      )}
    </div>
  );
}

TreeNode.displayName = 'TreeNode';
