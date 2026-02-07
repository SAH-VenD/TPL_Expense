import React, { useCallback } from 'react';
import { useDropzone, Accept, FileRejection } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface UploadedFile {
  file: File;
  preview?: string;
}

export interface FileUploadProps {
  label?: string;
  value: File[];
  onChange: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  value,
  onChange,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    'application/pdf': ['.pdf'],
  },
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  disabled,
  error,
  helperText,
  className,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        console.warn('Rejected files:', rejectedFiles);
      }
      const newFiles = multiple
        ? [...value, ...acceptedFiles].slice(0, maxFiles)
        : acceptedFiles.slice(0, 1);
      onChange(newFiles);
    },
    [value, onChange, multiple, maxFiles],
  );

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles: multiple ? maxFiles - value.length : 1,
    maxSize,
    multiple,
    disabled: disabled || (!multiple && value.length >= 1) || value.length >= maxFiles,
  });

  const isDisabled = disabled || (!multiple && value.length >= 1) || value.length >= maxFiles;

  return (
    <div className={clsx('w-full', className)}>
      {label && <label className="label">{label}</label>}

      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragActive && !isDragReject && 'border-primary-500 bg-primary-50',
          isDragReject && 'border-red-500 bg-red-50',
          error && 'border-red-500',
          isDisabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          !isDragActive && !error && !isDisabled && 'border-gray-300 hover:border-gray-400',
        )}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? (
            isDragReject ? (
              'File type not accepted'
            ) : (
              'Drop files here...'
            )
          ) : (
            <>
              <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {helperText || `Up to ${maxFiles} files, max ${formatFileSize(maxSize)} each`}
        </p>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {value.length > 0 && (
        <ul className="mt-4 space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                className="ml-4 flex-shrink-0 p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

FileUpload.displayName = 'FileUpload';
