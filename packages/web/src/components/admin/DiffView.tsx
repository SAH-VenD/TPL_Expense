import React from 'react';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface DiffViewProps {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  className?: string;
}

interface FieldDiff {
  field: string;
  before: unknown;
  after: unknown;
  isChanged: boolean;
  isAdded: boolean;
  isRemoved: boolean;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  // Format dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }
  return String(value);
}

function computeDiff(
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of Array.from(allKeys).sort()) {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];
    const beforeStr = JSON.stringify(beforeVal);
    const afterStr = JSON.stringify(afterVal);

    diffs.push({
      field: key,
      before: beforeVal,
      after: afterVal,
      isChanged: beforeStr !== afterStr && beforeVal !== undefined && afterVal !== undefined,
      isAdded: beforeVal === undefined && afterVal !== undefined,
      isRemoved: beforeVal !== undefined && afterVal === undefined,
    });
  }

  return diffs;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      <ClipboardDocumentIcon className="h-4 w-4" />
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-gray-900 text-white rounded">
          Copied!
        </span>
      )}
    </button>
  );
};

export const DiffView: React.FC<DiffViewProps> = ({ before, after, className }) => {
  const diffs = computeDiff(before, after);
  const changedDiffs = diffs.filter((d) => d.isChanged || d.isAdded || d.isRemoved);

  if (changedDiffs.length === 0) {
    return (
      <div className={clsx('text-sm text-gray-500 italic py-4 text-center', className)}>
        No changes detected
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {changedDiffs.map((diff) => (
        <div
          key={diff.field}
          className={clsx(
            'border rounded-lg overflow-hidden',
            diff.isAdded && 'border-green-200',
            diff.isRemoved && 'border-red-200',
            diff.isChanged && 'border-blue-200'
          )}
        >
          {/* Field header */}
          <div
            className={clsx(
              'px-3 py-2 text-sm font-medium flex items-center justify-between',
              diff.isAdded && 'bg-green-50 text-green-800',
              diff.isRemoved && 'bg-red-50 text-red-800',
              diff.isChanged && 'bg-blue-50 text-blue-800'
            )}
          >
            <span>{diff.field}</span>
            <span className="text-xs font-normal">
              {diff.isAdded && 'Added'}
              {diff.isRemoved && 'Removed'}
              {diff.isChanged && 'Changed'}
            </span>
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Before */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase">Before</span>
                {diff.before !== undefined && (
                  <CopyButton text={formatValue(diff.before)} />
                )}
              </div>
              <div
                className={clsx(
                  'text-sm font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto',
                  diff.isAdded ? 'text-gray-400' : 'text-gray-900',
                  (diff.isChanged || diff.isRemoved) && 'bg-red-50 p-2 rounded'
                )}
              >
                {diff.before === undefined ? (
                  <span className="text-gray-400 italic">Not set</span>
                ) : (
                  formatValue(diff.before)
                )}
              </div>
            </div>

            {/* After */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase">After</span>
                {diff.after !== undefined && (
                  <CopyButton text={formatValue(diff.after)} />
                )}
              </div>
              <div
                className={clsx(
                  'text-sm font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto',
                  diff.isRemoved ? 'text-gray-400' : 'text-gray-900',
                  (diff.isChanged || diff.isAdded) && 'bg-green-50 p-2 rounded'
                )}
              >
                {diff.after === undefined ? (
                  <span className="text-gray-400 italic">Removed</span>
                ) : (
                  formatValue(diff.after)
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Full JSON views */}
      <div className="border-t pt-4 mt-4">
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
            View full JSON
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Before (Full)</span>
                {before && <CopyButton text={JSON.stringify(before, null, 2)} />}
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60">
                {before ? JSON.stringify(before, null, 2) : 'null'}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase">After (Full)</span>
                {after && <CopyButton text={JSON.stringify(after, null, 2)} />}
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60">
                {after ? JSON.stringify(after, null, 2) : 'null'}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

DiffView.displayName = 'DiffView';
