import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useLazyGetReceiptDownloadUrlQuery } from '@/features/expenses/services/expenses.service';
import type { Receipt } from '@/features/expenses/services/expenses.service';

export interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const [getDownloadUrl, { data, isLoading, error }] = useLazyGetReceiptDownloadUrlQuery();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen && receipt) {
      getDownloadUrl(receipt.id);
      setImageError(false);
    }
  }, [isOpen, receipt, getDownloadUrl]);

  const isImage = receipt?.mimeType?.startsWith('image/');
  const isPdf = receipt?.mimeType === 'application/pdf';

  const handleDownload = () => {
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const displayName = receipt?.originalName || receipt?.fileName || 'Receipt';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      size="full"
    >
      <ModalBody className="min-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-600">Loading receipt...</span>
          </div>
        )}

        {error && (
          <div className="py-8">
            <Alert variant="error" title="Failed to load receipt">
              Unable to load the receipt file. Please try again later.
            </Alert>
          </div>
        )}

        {data?.url && !isLoading && (
          <div className="flex flex-col items-center">
            {isImage && !imageError ? (
              <img
                src={data.url}
                alt={displayName}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
                onError={() => setImageError(true)}
              />
            ) : isPdf ? (
              <iframe
                src={data.url}
                title={displayName}
                className="w-full h-[60vh] rounded-lg border border-gray-200"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg w-full">
                <span className="text-6xl mb-4">📄</span>
                <p className="text-gray-600 font-medium">{displayName}</p>
                <p className="text-gray-500 text-sm mt-1">
                  Preview not available for this file type
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download to view
                </button>
              </div>
            )}

            {imageError && (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg w-full">
                <span className="text-6xl mb-4">🖼️</span>
                <p className="text-gray-600 font-medium">Image failed to load</p>
                <button
                  onClick={handleDownload}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download instead
                </button>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Close
        </button>
        {data?.url && !imageError && (isImage || isPdf) && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
};

ReceiptViewerModal.displayName = 'ReceiptViewerModal';
