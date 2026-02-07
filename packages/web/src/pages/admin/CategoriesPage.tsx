import { useState } from 'react';
import { PageHeader, Spinner, EmptyState } from '@/components/ui';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useReactivateCategoryMutation,
  type Category,
} from '@/features/admin/services/admin.service';

interface CategoryFormData {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  maxAmount?: number;
  requiresPreApproval: boolean;
  requiresReceipt: boolean;
}

export function CategoriesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    code: '',
    description: '',
    parentId: '',
    maxAmount: undefined,
    requiresPreApproval: false,
    requiresReceipt: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories, isLoading, error } = useGetCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [reactivateCategory] = useReactivateCategoryMutation();

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      parentId: '',
      maxAmount: undefined,
      requiresPreApproval: false,
      requiresReceipt: true,
    });
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      parentId: category.parentId || '',
      maxAmount: category.maxAmount,
      requiresPreApproval: category.requiresPreApproval,
      requiresReceipt: category.requiresReceipt,
    });
    setFormError(null);
    setEditingCategory(category);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingCategory(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description?.trim() || undefined,
      parentId: formData.parentId || undefined,
      maxAmount: formData.maxAmount || undefined,
      requiresPreApproval: formData.requiresPreApproval,
      requiresReceipt: formData.requiresReceipt,
    };

    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, data: payload }).unwrap();
      } else {
        await createCategory(payload).unwrap();
      }
      handleCloseModal();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setFormError(error.data?.message || 'Failed to save category');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      if (category.isActive) {
        await deleteCategory(category.id).unwrap();
      } else {
        await reactivateCategory(category.id).unwrap();
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      alert(error.data?.message || 'Failed to update category status');
    }
  };

  // Flatten categories for parent dropdown (only show top-level and active)
  const parentOptions =
    categories?.filter((c) => c.isActive && !c.parentId && c.id !== editingCategory?.id) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading categories"
        description="There was a problem loading the categories. Please try again."
        icon="exclamation-triangle"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Categories"
        subtitle="Manage expense categories and subcategories"
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Categories' }]}
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add Category
          </button>
        }
      />

      {/* Category List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!categories || categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No categories found. Click "Add Category" to create one.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pre-Approval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {category.parent && <span className="text-gray-400 mr-2">└</span>}
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{category.code}</code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {category.maxAmount ? `PKR ${category.maxAmount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {category.requiresPreApproval ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Required
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {category.requiresReceipt ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Required
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Optional</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(category)}
                        className={`px-3 py-1 text-sm border rounded ${
                          category.isActive
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {category.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCategory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  pattern="[A-Z0-9_]+"
                  title="Uppercase letters, numbers, and underscores only"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., TRAVEL, OFFICE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">None (Top Level)</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount (PKR)
                </label>
                <input
                  type="number"
                  value={formData.maxAmount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxAmount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Leave blank for no limit"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresPreApproval"
                  checked={formData.requiresPreApproval}
                  onChange={(e) =>
                    setFormData({ ...formData, requiresPreApproval: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="requiresPreApproval" className="ml-2 text-sm text-gray-700">
                  Requires pre-approval
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresReceipt"
                  checked={formData.requiresReceipt}
                  onChange={(e) => setFormData({ ...formData, requiresReceipt: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="requiresReceipt" className="ml-2 text-sm text-gray-700">
                  Requires receipt
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {(() => {
                    if (isCreating || isUpdating) return 'Saving...';
                    if (editingCategory) return 'Save Changes';
                    return 'Create Category';
                  })()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
