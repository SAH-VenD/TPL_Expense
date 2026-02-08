import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type { OcrResult } from '@/features/expenses/services/expenses.service';

interface OcrPreviewProps {
  ocrResult: OcrResult;
  onApply: (data: Partial<OcrApplyData>) => void;
  onDismiss: () => void;
}

export interface OcrApplyData {
  amount: string;
  taxAmount: string;
  expenseDate: string;
  invoiceNumber: string;
  description: string;
}

export function OcrPreview({ ocrResult, onApply, onDismiss }: OcrPreviewProps) {
  const confidence = ocrResult.confidence;
  const isHighConfidence = confidence >= 80;

  const handleApplyAll = () => {
    const data: Partial<OcrApplyData> = {};
    if (ocrResult.amount) data.amount = String(ocrResult.amount);
    if (ocrResult.taxAmount) data.taxAmount = String(ocrResult.taxAmount);
    if (ocrResult.date) data.expenseDate = ocrResult.date;
    if (ocrResult.invoiceNumber) data.invoiceNumber = ocrResult.invoiceNumber;
    if (ocrResult.vendorName) data.description = `Purchase from ${ocrResult.vendorName}`;
    onApply(data);
  };

  const fields = [
    { label: 'Vendor', value: ocrResult.vendorName },
    { label: 'Amount', value: ocrResult.amount ? `${ocrResult.currency || 'PKR'} ${ocrResult.amount}` : undefined },
    { label: 'Tax', value: ocrResult.taxAmount ? `${ocrResult.currency || 'PKR'} ${ocrResult.taxAmount}` : undefined },
    { label: 'Total', value: ocrResult.total ? `${ocrResult.currency || 'PKR'} ${ocrResult.total}` : undefined },
    { label: 'Date', value: ocrResult.date },
    { label: 'Invoice #', value: ocrResult.invoiceNumber },
  ].filter((f) => f.value);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-blue-900">OCR Data Extracted</h4>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isHighConfidence
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {isHighConfidence ? (
                <CheckCircleIcon className="h-3 w-3" />
              ) : (
                <ExclamationTriangleIcon className="h-3 w-3" />
              )}
              {confidence.toFixed(0)}% confidence
            </span>
          </div>
          {!isHighConfidence && (
            <p className="text-xs text-yellow-700 mt-1">
              Low confidence - please review extracted values carefully.
            </p>
          )}
        </div>
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {fields.map((field) => (
            <div key={field.label} className="bg-white rounded px-3 py-2">
              <span className="text-xs text-gray-500">{field.label}</span>
              <p className="text-sm font-medium text-gray-900">{field.value}</p>
            </div>
          ))}
        </div>
      )}

      {ocrResult.lineItems && ocrResult.lineItems.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-600 mb-1">Line Items</h5>
          <div className="bg-white rounded p-2 space-y-1">
            {ocrResult.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.description}
                  {item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}
                </span>
                <span className="font-medium">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApplyAll}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Apply to form
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
