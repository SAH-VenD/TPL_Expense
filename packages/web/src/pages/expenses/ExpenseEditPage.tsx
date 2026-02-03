import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetCategoriesQuery } from '@/features/admin/services/admin.service';
import {
  useGetExpenseQuery,
  useUpdateExpenseMutation,
  useUploadReceiptMutation,
  useDeleteReceiptMutation,
} from '@/features/expenses/services/expenses.service';
import type { Currency, ExpenseType, Receipt } from '@/features/expenses/services/expenses.service';
import { showToast } from '@/components/ui';
import { DatePicker } from '@/components/ui/DatePicker';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

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
  newReceipts: File[];
}

export function ExpenseEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: expense, isLoading: expenseLoading, error: expenseError } = useGetExpenseQuery(id!, {
    skip: !id,
  });
  const { data: categories, isLoading: categoriesLoading } = useGetCategoriesQuery();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();
  const [deleteReceipt] = useDeleteReceiptMutation();

  const loading = isUpdating || isUploading;

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
    newReceipts: [],
  });

  const [existingReceipts, setExistingReceipts] = useState<Receipt[]>([]);
  const [receiptsToDelete, setReceiptsToDelete] = useState<string[]>([]);

  // Populate form when expense data loads
  useEffect(() => {
    if (expense) {
      setFormData({
        type: expense.type,
        categoryId: expense.categoryId,
        vendorId: expense.vendorId || '',
        description: expense.description || '',
        amount: expense.amount.toString(),
        taxAmount: expense.taxAmount?.toString() || '',
        currency: expense.currency,
        expenseDate: expense.expenseDate.split('T')[0],
        invoiceNumber: expense.invoiceNumber || '',
        newReceipts: [],
      });
      setExistingReceipts(expense.receipts || []);
    }
  }, [expense]);

  // Only allow editing DRAFT or REJECTED expenses
  const canEdit = expense?.status === 'DRAFT' || expense?.status === 'REJECTED' || expense?.status === 'CLARIFICATION_REQUESTED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    try {
      // Step 1: Delete marked receipts
      for (const receiptId of receiptsToDelete) {
        await deleteReceipt(receiptId).unwrap();
      }

      // Step 2: Update the expense
      await updateExpense({
        id,
        data: {
          categoryId: formData.categoryId,
          description: formData.description,
          amount: parseFloat(formData.amount),
          taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : undefined,
          currency: formData.currency,
          expenseDate: formData.expenseDate,
          vendorId: formData.vendorId || undefined,
          invoiceNumber: formData.invoiceNumber || undefined,
        },
      }).unwrap();

      // Step 3: Upload new receipts
      for (const file of formData.newReceipts) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        await uploadReceipt({ expenseId: id, file: formDataUpload }).unwrap();
      }

      showToast.success('Expense updated successfully');
      navigate(`/expenses/${id}`);
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : 'Failed to update expense';
      showToast.error(errorMessage || 'Failed to update expense');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        newReceipts: [...formData.newReceipts, ...Array.from(e.target.files)],
      });
    }
  };

  const handleRemoveExistingReceipt = (receiptId: string) => {
    setReceiptsToDelete([...receiptsToDelete, receiptId]);
    setExistingReceipts(existingReceipts.filter((r) => r.id !== receiptId));
  };

  const handleRemoveNewReceipt = (index: number) => {
    setFormData({
      ...formData,
      newReceipts: formData.newReceipts.filter((_, i) => i !== index),
    });
  };

  const activeCategories = categories?.filter((cat) => cat.isActive) || [];

  if (expenseLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading expense...</span>
      </div>
    );
  }

  if (expenseError || !expense) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="error" title="Failed to load expense">
          The expense could not be found or you don&apos;t have permission to view it.
        </Alert>
        <button
          onClick={() => navigate('/expenses')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Expenses
        </button>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="warning" title="Cannot edit expense">
          This expense cannot be edited because it has been submitted for approval or is in a non-editable status ({expense.status}).
        </Alert>
        <button
          onClick={() => navigate(`/expenses/${id}`)}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Expense Details
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Expense</h1>
        <button
          onClick={() => navigate(`/expenses/${id}`)}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Expense Type (read-only for editing) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Expense Type</label>
          <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-gray-700">
            {formData.type === 'OUT_OF_POCKET' ? 'Out of Pocket' : 'Petty Cash'}
          </div>
          <p className="mt-1 text-xs text-gray-500">Expense type cannot be changed after creation</p>
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

        {/* Receipts Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Receipts</label>

          {/* Existing Receipts */}
          {existingReceipts.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-600">Existing Receipts</h4>
              {existingReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">
                    {receipt.originalName || receipt.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingReceipt(receipt.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New Receipts to Upload */}
          {formData.newReceipts.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-600">New Receipts to Upload</h4>
              {formData.newReceipts.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewReceipt(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Area */}
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
              className="cursor-pointer text-blue-600 hover:text-blue-500"
            >
              <span className="text-3xl block mb-2">📎</span>
              <span className="font-medium">Click to add more receipts</span>
              <span className="block text-sm text-gray-500 mt-1">
                JPG, PNG, PDF up to 10MB
              </span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(`/expenses/${id}`)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.categoryId || !formData.description || !formData.amount}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
