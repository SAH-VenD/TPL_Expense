import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery } from '@/features/admin/services/admin.service';
import {
  useCreateExpenseMutation,
  useSubmitExpenseMutation,
  useUploadReceiptMutation,
} from '@/features/expenses/services/expenses.service';
import type { Currency, ExpenseType } from '@/features/expenses/services/expenses.service';
import { showToast } from '@/components/ui';
import { DatePicker } from '@/components/ui/DatePicker';

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

export function ExpenseCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('draft');

  const { data: categories, isLoading: categoriesLoading } = useGetCategoriesQuery();
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [submitExpense, { isLoading: isSubmitting }] = useSubmitExpenseMutation();
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();

  const loading = isCreating || isSubmitting || isUploading;

  const [formData, setFormData] = useState<ExpenseFormData>({
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
  });

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
      setFormData({
        ...formData,
        receipts: [...formData.receipts, ...Array.from(e.target.files)],
      });
    }
  };

  const activeCategories = categories?.filter((cat) => cat.isActive) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Create Expense</h1>
        <button
          onClick={() => navigate('/expenses')}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {['Details', 'Receipts', 'Review'].map((label, index) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step > index + 1
                  ? 'bg-green-600 text-white'
                  : step === index + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > index + 1 ? '✓' : index + 1}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Expense Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ExpenseType })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="OUT_OF_POCKET">Out of Pocket</option>
                <option value="PETTY_CASH">Petty Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value as Currency })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                <input
                  type="number"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.categoryId || !formData.description || !formData.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Upload Receipts
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Receipts */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Receipts
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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
                  className="cursor-pointer text-blue-600 hover:text-blue-500"
                >
                  <span className="text-4xl block mb-2">📎</span>
                  <span className="font-medium">Click to upload</span>
                  <span className="block text-sm text-gray-500 mt-1">
                    JPG, PNG, PDF up to 10MB
                  </span>
                </label>
              </div>
              <p className="mt-2 text-sm text-amber-600">
                Note: At least one receipt is required to submit for approval.
              </p>
            </div>

            {formData.receipts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Uploaded Files</h3>
                {formData.receipts.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          receipts: formData.receipts.filter((_, i) => i !== index),
                        })
                      }
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Review
              </button>
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
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <div className="space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  onClick={handleSaveAsDraft}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isCreating ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="submit"
                  disabled={loading || formData.receipts.length === 0}
                  onClick={handleSubmitForApproval}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
