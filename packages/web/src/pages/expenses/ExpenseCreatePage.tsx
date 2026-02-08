import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraIcon, SparklesIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useGetCategoriesQuery } from '@/features/admin/services/admin.service';
import {
  useCreateExpenseMutation,
  useSubmitExpenseMutation,
  useUploadReceiptMutation,
  useProcessReceiptOcrMutation,
} from '@/features/expenses/services/expenses.service';
import type { Currency, ExpenseType, OcrResult } from '@/features/expenses/services/expenses.service';
import { showToast, PageHeader, Button, Input, Textarea } from '@/components/ui';
import { DatePicker } from '@/components/ui/DatePicker';
import { CameraCapture } from '@/components/expenses/CameraCapture';
import { OcrPreview } from '@/components/expenses/OcrPreview';
import type { OcrApplyData } from '@/components/expenses/OcrPreview';
import { useUnsavedChanges } from '@/hooks';

interface ExpenseFormData {
  type: ExpenseType;
  categoryId: string;
  vendorId: string;
  description: string;
  amount: string;
  taxAmount: string;
  currency: Currency;
  expenseDate: string;
  invoiceNumber: string;
  receipts: File[];
}

const initialFormData: ExpenseFormData = {
  type: 'OUT_OF_POCKET',
  categoryId: '',
  vendorId: '',
  description: '',
  amount: '',
  taxAmount: '',
  currency: 'PKR',
  expenseDate: new Date().toISOString().split('T')[0],
  invoiceNumber: '',
  receipts: [],
};

type FieldErrors = Partial<Record<'categoryId' | 'description' | 'amount', string>>;

export function ExpenseCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('draft');
  const [showCamera, setShowCamera] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data: categories, isLoading: categoriesLoading } = useGetCategoriesQuery();
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [submitExpense, { isLoading: isSubmitting }] = useSubmitExpenseMutation();
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();
  const [processOcr] = useProcessReceiptOcrMutation();

  const loading = isCreating || isSubmitting || isUploading;

  const [formData, setFormData] = useState<ExpenseFormData>({ ...initialFormData });

  // Track if form has been modified for unsaved changes warning
  const isDirty = useMemo(() => {
    return (
      formData.categoryId !== '' ||
      formData.description !== '' ||
      formData.amount !== '' ||
      formData.receipts.length > 0 ||
      formData.invoiceNumber !== '' ||
      formData.taxAmount !== ''
    );
  }, [formData]);

  useUnsavedChanges(isDirty);

  const validateField = (field: keyof FieldErrors, value: string) => {
    const labels: Record<keyof FieldErrors, string> = {
      categoryId: 'Category',
      description: 'Description',
      amount: 'Amount',
    };
    if (!value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [field]: `${labels[field]} is required` }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNextStep = () => {
    // Validate required fields before proceeding
    const errors: FieldErrors = {};
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.amount) errors.amount = 'Amount is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus the first error field
      const firstErrorField = Object.keys(errors)[0];
      const fieldMap: Record<string, string> = {
        categoryId: '[data-field="categoryId"]',
        description: '[data-field="description"]',
        amount: '[data-field="amount"]',
      };
      const el = document.querySelector<HTMLElement>(fieldMap[firstErrorField]);
      el?.focus();
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Step 1: Create the expense
      const expense = await createExpense({
        type: formData.type,
        categoryId: formData.categoryId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : undefined,
        currency: formData.currency,
        expenseDate: formData.expenseDate,
        vendorId: formData.vendorId || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
      }).unwrap();

      // Step 2: Upload receipts
      for (const file of formData.receipts) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        await uploadReceipt({ expenseId: expense.id, file: formDataUpload }).unwrap();
      }

      // Step 3: Submit for approval if requested
      if (submitMode === 'submit' && formData.receipts.length > 0) {
        await submitExpense(expense.id).unwrap();
        showToast.success('Expense submitted for approval');
      } else {
        showToast.success('Expense saved as draft');
      }

      navigate('/expenses');
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : 'Failed to create expense';
      showToast.error(errorMessage || 'Failed to create expense');
    }
  };

  const handleSaveAsDraft = () => {
    setSubmitMode('draft');
  };

  const handleSubmitForApproval = () => {
    if (formData.receipts.length === 0) {
      showToast.error('At least one receipt is required to submit for approval');
      return;
    }
    setSubmitMode('submit');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData({
        ...formData,
        receipts: [...formData.receipts, ...newFiles],
      });
      // Trigger OCR on first image file added
      const imageFile = newFiles.find((f) => f.type.startsWith('image/'));
      if (imageFile && !ocrResult) {
        triggerOcrForFile(imageFile);
      }
    }
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    setFormData((prev) => ({
      ...prev,
      receipts: [...prev.receipts, file],
    }));
    triggerOcrForFile(file);
  };

  const triggerOcrForFile = async (file: File) => {
    setIsProcessingOcr(true);
    try {
      // Create a temporary expense to upload the receipt for OCR
      const tempExpense = await createExpense({
        type: formData.type || 'OUT_OF_POCKET',
        categoryId: formData.categoryId || categories?.find((c) => c.isActive)?.id || '',
        description: 'OCR processing - auto-generated',
        amount: 0,
        currency: formData.currency || 'PKR',
        expenseDate: new Date().toISOString().split('T')[0],
      }).unwrap();

      // Upload the file
      const uploadData = new FormData();
      uploadData.append('file', file);
      const receipt = await uploadReceipt({
        expenseId: tempExpense.id,
        file: uploadData,
      }).unwrap();

      // Trigger OCR processing
      const result = await processOcr(receipt.id).unwrap();
      setOcrResult(result);
      showToast.success('Receipt scanned successfully');
    } catch {
      // OCR is best-effort - don't block the user
      showToast.error('Could not process receipt automatically. Please fill in details manually.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleOcrApply = (data: Partial<OcrApplyData>) => {
    setFormData((prev) => ({
      ...prev,
      ...(data.amount && { amount: data.amount }),
      ...(data.taxAmount && { taxAmount: data.taxAmount }),
      ...(data.expenseDate && { expenseDate: data.expenseDate }),
      ...(data.invoiceNumber && { invoiceNumber: data.invoiceNumber }),
      ...(data.description && { description: data.description }),
    }));
    setOcrResult(null);
    showToast.success('OCR data applied to form');
  };

  const activeCategories = categories?.filter((cat) => cat.isActive) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create Expense"
        subtitle="Submit a new expense for reimbursement"
        breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'New Expense' }]}
        actions={
          <Button variant="secondary" onClick={() => navigate('/expenses')}>
            Cancel
          </Button>
        }
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {['Details', 'Receipts', 'Review'].map((label, index) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > index + 1
                  ? 'bg-green-600 text-white'
                  : step === index + 1
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > index + 1 ? (
                <CheckIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-600">{label}</span>
            {index < 2 && <div className="w-12 h-0.5 mx-4 bg-gray-200" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-6">
            {/* OCR Preview */}
            {ocrResult && (
              <OcrPreview
                ocrResult={ocrResult}
                onApply={handleOcrApply}
                onDismiss={() => setOcrResult(null)}
              />
            )}

            {isProcessingOcr && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="text-sm text-blue-700">Scanning receipt with OCR...</span>
              </div>
            )}

            <div>
              <label className="label">Expense Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ExpenseType })}
                className="input"
              >
                <option value="OUT_OF_POCKET">Out of Pocket</option>
                <option value="PETTY_CASH">Petty Cash</option>
              </select>
            </div>

            <div>
              <label className="label">
                Category
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                data-field="categoryId"
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value });
                  if (e.target.value) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.categoryId;
                      return next;
                    });
                  }
                }}
                onBlur={() => validateField('categoryId', formData.categoryId)}
                className={`input ${fieldErrors.categoryId ? 'input-error' : ''}`}
                required
                disabled={categoriesLoading}
              >
                <option value="">
                  {categoriesLoading ? 'Loading categories...' : 'Select a category'}
                </option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.categoryId}</p>
              )}
            </div>

            <div>
              <Textarea
                data-field="description"
                label="Description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (e.target.value.trim()) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.description;
                      return next;
                    });
                  }
                }}
                onBlur={() => validateField('description', formData.description)}
                error={fieldErrors.description}
                minRows={3}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value as Currency })
                  }
                  className="input"
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <Input
                  data-field="amount"
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value });
                    if (e.target.value) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.amount;
                        return next;
                      });
                    }
                  }}
                  onBlur={() => validateField('amount', formData.amount)}
                  error={fieldErrors.amount}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Input
                  label="Tax Amount"
                  type="number"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Expense Date"
                value={formData.expenseDate}
                onChange={(date) => setFormData({ ...formData, expenseDate: date })}
                required
              />
              <Input
                label="Invoice Number"
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleNextStep}
              >
                Next: Upload Receipts
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Receipts */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="label mb-2">Upload Receipts</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="cursor-pointer text-primary-600 hover:text-primary-500"
                  >
                    <PaperClipIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <span className="font-medium">Choose files</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      JPG, PNG, PDF up to 10MB
                    </span>
                  </label>
                </div>

                {/* Camera Capture */}
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <CameraIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <span className="font-medium text-primary-600">Take a photo</span>
                  <span className="block text-sm text-gray-500 mt-1">
                    Use camera to capture receipt
                  </span>
                </button>
              </div>
              <p className="mt-2 text-sm text-amber-600">
                Note: At least one receipt is required to submit for approval. Images are
                automatically scanned with OCR.
              </p>
            </div>

            {isProcessingOcr && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="text-sm text-blue-700">
                  Processing receipt with OCR... Results will appear on the Details step.
                </span>
              </div>
            )}

            {formData.receipts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">
                  Uploaded Files ({formData.receipts.length})
                </h3>
                {formData.receipts.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                          PDF
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="block text-xs text-gray-400">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          receipts: formData.receipts.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next: Review
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Your Expense</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {formData.type === 'OUT_OF_POCKET' ? 'Out of Pocket' : 'Petty Cash'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">
                  {activeCategories.find((c) => c.id === formData.categoryId)?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Description:</span>
                <span className="font-medium">{formData.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  {formData.currency} {formData.amount}
                  {formData.taxAmount && ` (+${formData.taxAmount} tax)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formData.expenseDate}</span>
              </div>
              {formData.invoiceNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice #:</span>
                  <span className="font-medium">{formData.invoiceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Receipts:</span>
                <span className="font-medium">{formData.receipts.length} file(s)</span>
              </div>
            </div>

            {formData.receipts.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  No receipts attached. You can save as draft, but receipts are required to submit
                  for approval.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="space-x-4">
                <Button
                  variant="secondary"
                  type="submit"
                  loading={isCreating}
                  disabled={loading}
                  onClick={handleSaveAsDraft}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={isSubmitting}
                  disabled={loading || formData.receipts.length === 0}
                  onClick={handleSubmitForApproval}
                >
                  Submit for Approval
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
