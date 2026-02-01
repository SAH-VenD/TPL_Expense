import React, { useState, useCallback, useMemo } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { TreeNode } from './TreeNode';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

export interface TreeAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (node: T) => void;
  variant?: 'default' | 'danger';
  disabled?: (node: T) => boolean;
}

export interface TreeViewProps<T extends { id: string; parentId?: string | null; children?: T[] }> {
  data: T[];
  onNodeClick?: (node: T) => void;
  onDragEnd?: (node: T, newParentId: string | undefined, newIndex: number) => Promise<void>;
  onActionClick?: (action: string, node: T) => void;
  actionMenuItems?: TreeAction<T>[];
  renderNode: (node: T, isExpanded: boolean) => React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isDraggable?: boolean;
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  showSearch?: boolean;
  className?: string;
}

// Build tree from flat array
function buildTree<T extends { id: string; parentId?: string | null; children?: T[] }>(
  items: T[],
  parentId: string | null | undefined = null
): T[] {
  return items
    .filter((item) => item.parentId === parentId || (!item.parentId && !parentId))
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}

// Flatten tree for search
function flattenTree<T extends { id: string; children?: T[] }>(tree: T[]): T[] {
  return tree.reduce<T[]>((acc, node) => {
    acc.push(node);
    if (node.children) {
      acc.push(...flattenTree(node.children));
    }
    return acc;
  }, []);
}

// Get all parent IDs of a node
function getParentIds<T extends { id: string; parentId?: string | null }>(
  items: T[],
  nodeId: string
): string[] {
  const node = items.find((item) => item.id === nodeId);
  if (!node || !node.parentId) return [];
  return [node.parentId, ...getParentIds(items, node.parentId)];
}

export function TreeView<T extends { id: string; parentId?: string | null; children?: T[] }>({
  data,
  onNodeClick,
  onDragEnd,
  actionMenuItems,
  renderNode,
  searchQuery: externalSearchQuery,
  onSearchChange,
  isDraggable = false,
  expandedIds: externalExpandedIds,
  onExpandedChange,
  emptyMessage = 'No items found',
  isLoading = false,
  showSearch = true,
  className,
}: TreeViewProps<T>) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalExpandedIds, setInternalExpandedIds] = useState<string[]>([]);
  const [draggedNode, setDraggedNode] = useState<T | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const expandedIds = externalExpandedIds ?? internalExpandedIds;

  const handleSearchChange = useCallback(
    (value: string) => {
      if (onSearchChange) {
        onSearchChange(value);
      } else {
        setInternalSearchQuery(value);
      }
    },
    [onSearchChange]
  );

  const handleExpandedChange = useCallback(
    (ids: string[]) => {
      if (onExpandedChange) {
        onExpandedChange(ids);
      } else {
        setInternalExpandedIds(ids);
      }
    },
    [onExpandedChange]
  );

  const toggleExpanded = useCallback(
    (nodeId: string) => {
      const newExpandedIds = expandedIds.includes(nodeId)
        ? expandedIds.filter((id) => id !== nodeId)
        : [...expandedIds, nodeId];
      handleExpandedChange(newExpandedIds);
    },
    [expandedIds, handleExpandedChange]
  );

  // Build tree from flat data
  const tree = useMemo(() => buildTree(data), [data]);

  // Filter tree based on search query and auto-expand parents of matches
  const { filteredTree, matchingIds, expandedIdsForSearch } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredTree: tree, matchingIds: new Set<string>(), expandedIdsForSearch: [] };
    }

    const query = searchQuery.toLowerCase();
    const flatItems = flattenTree(tree);
    const matches = flatItems.filter((item) => {
      const nodeContent = JSON.stringify(item).toLowerCase();
      return nodeContent.includes(query);
    });
    const matchingIds = new Set(matches.map((m) => m.id));

    // Get all parent IDs of matching nodes to expand them
    const parentsToExpand = new Set<string>();
    matches.forEach((match) => {
      const parents = getParentIds(data, match.id);
      parents.forEach((p) => parentsToExpand.add(p));
    });

    return {
      filteredTree: tree,
      matchingIds,
      expandedIdsForSearch: Array.from(parentsToExpand),
    };
  }, [tree, searchQuery, data]);

  const effectiveExpandedIds = useMemo(() => {
    if (searchQuery.trim()) {
      return [...new Set([...expandedIds, ...expandedIdsForSearch])];
    }
    return expandedIds;
  }, [expandedIds, expandedIdsForSearch, searchQuery]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, node: T) => {
      e.dataTransfer.effectAllowed = 'move';
      setDraggedNode(node);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverNodeId(nodeId);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetNode: T) => {
      e.preventDefault();
      if (!draggedNode || draggedNode.id === targetNode.id || !onDragEnd) return;

      // Prevent dropping a parent onto its child
      const targetParents = getParentIds(data, targetNode.id);
      if (targetParents.includes(draggedNode.id)) return;

      await onDragEnd(draggedNode, targetNode.id, 0);
      setDraggedNode(null);
      setDragOverNodeId(null);
    },
    [draggedNode, onDragEnd, data]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedNode(null);
    setDragOverNodeId(null);
  }, []);

  const renderTreeNode = (node: T, level: number = 0) => {
    const isExpanded = effectiveExpandedIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isHighlighted = matchingIds.has(node.id);
    const isDragOver = dragOverNodeId === node.id;

    return (
      <div key={node.id}>
        <TreeNode
          node={node}
          level={level}
          isExpanded={isExpanded}
          onToggleExpand={() => toggleExpanded(node.id)}
          isDragging={draggedNode?.id === node.id}
          isDragOver={isDragOver}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDrop={(e) => handleDrop(e, node)}
          onDragEnd={handleDragEnd}
          renderNode={renderNode}
          actionMenuItems={actionMenuItems}
          onClick={onNodeClick}
          hasChildren={hasChildren ?? false}
          isHighlighted={isHighlighted}
          isDraggable={isDraggable}
        />
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children!.map((child) => renderTreeNode(child as T, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {showSearch && (
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
        />
      )}
      <div role="tree" aria-label="Tree view" className="space-y-1">
        {filteredTree.length === 0 ? (
          <EmptyState title={emptyMessage} description="Try adding some items or adjusting your search." />
        ) : (
          filteredTree.map((node) => renderTreeNode(node))
        )}
      </div>
    </div>
  );
}

TreeView.displayName = 'TreeView';
