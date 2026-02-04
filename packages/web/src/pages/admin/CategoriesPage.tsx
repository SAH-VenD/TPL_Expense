import { useState } from 'react';
import { PageHeader } from '@/components/ui';

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent?: { name: string };
  requiresPreApproval: boolean;
  maxAmount?: number;
  isActive: boolean;
}

export function CategoriesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Mock data
  const categories: Category[] = [
    {
      id: '1',
      name: 'Travel',
      code: 'TRAVEL',
      description: 'Business travel expenses',
      requiresPreApproval: true,
      maxAmount: 100000,
      isActive: true,
    },
    {
      id: '2',
      name: 'Domestic Travel',
      code: 'TRAVEL_DOM',
      description: 'Travel within Pakistan',
      parent: { name: 'Travel' },
      requiresPreApproval: false,
      maxAmount: 50000,
      isActive: true,
    },
    {
      id: '3',
      name: 'International Travel',
      code: 'TRAVEL_INT',
      description: 'Travel outside Pakistan',
      parent: { name: 'Travel' },
      requiresPreApproval: true,
      maxAmount: 200000,
      isActive: true,
    },
    {
      id: '4',
      name: 'Office Supplies',
      code: 'OFFICE',
      description: 'General office supplies and equipment',
      requiresPreApproval: false,
      maxAmount: 25000,
      isActive: true,
    },
    {
      id: '5',
      name: 'Meals & Entertainment',
      code: 'MEALS',
      description: 'Business meals and client entertainment',
      requiresPreApproval: false,
      maxAmount: 15000,
      isActive: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Categories"
        subtitle="Manage expense categories and subcategories"
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Categories' }]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add Category
          </button>
        }
      />

      {/* Category Tree/List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      {category.parent && (
                        <span className="text-gray-400 mr-2">└</span>
                      )}
                      {category.name}
                    </p>
                    {category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {category.code}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {category.maxAmount
                    ? `PKR ${category.maxAmount.toLocaleString()}`
                    : '-'}
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
                      onClick={() => setEditingCategory(category)}
                      className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50">
                      {category.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCategory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  defaultValue={editingCategory?.name}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  defaultValue={editingCategory?.code}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., TRAVEL, OFFICE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  defaultValue={editingCategory?.description}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="">None (Top Level)</option>
                  <option value="1">Travel</option>
                  <option value="4">Office Supplies</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount (PKR)
                </label>
                <input
                  type="number"
                  defaultValue={editingCategory?.maxAmount}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Leave blank for no limit"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresPreApproval"
                  defaultChecked={editingCategory?.requiresPreApproval}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="requiresPreApproval"
                  className="ml-2 text-sm text-gray-700"
                >
                  Requires pre-approval
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
