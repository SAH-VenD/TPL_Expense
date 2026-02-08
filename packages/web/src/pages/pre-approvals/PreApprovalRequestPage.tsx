import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePreApprovalMutation } from '@/features/pre-approvals/services/pre-approvals.service';
import { useGetCategoriesQuery } from '@/features/admin/services/admin.service';
import { PageHeader, showToast, Spinner } from '@/components/ui';

export function PreApprovalRequestPage() {
  const navigate = useNavigate();
  const [createPreApproval, { isLoading }] = useCreatePreApprovalMutation();
  const { data: categories, isLoading: categoriesLoading } = useGetCategoriesQuery();

  const [form, setForm] = useState({
    categoryId: '',
    estimatedAmount: '',
    purpose: '',
    expiresAt: '',
    travelDestination: '',
    departureDate: '',
    returnDate: '',
    travelPurpose: '',
  });
  const [showTravel, setShowTravel] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: {
      categoryId: string;
      estimatedAmount: number;
      purpose: string;
      expiresAt?: string;
      travelDetails?: {
        destination?: string;
        departureDate?: string;
        returnDate?: string;
        purpose?: string;
      };
    } = {
      categoryId: form.categoryId,
      estimatedAmount: Number(form.estimatedAmount),
      purpose: form.purpose,
    };

    if (form.expiresAt) {
      payload.expiresAt = form.expiresAt;
    }

    if (showTravel) {
      payload.travelDetails = {};
      if (form.travelDestination) payload.travelDetails.destination = form.travelDestination;
      if (form.departureDate) payload.travelDetails.departureDate = form.departureDate;
      if (form.returnDate) payload.travelDetails.returnDate = form.returnDate;
      if (form.travelPurpose) payload.travelDetails.purpose = form.travelPurpose;
    }

    try {
      const result = await createPreApproval(payload).unwrap();
      showToast.success('Pre-approval request submitted');
      navigate(`/pre-approvals/${result.id}`);
    } catch {
      showToast.error('Failed to submit pre-approval request');
    }
  };

  if (categoriesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Pre-Approval"
        subtitle="Submit a request for expense pre-approval"
        breadcrumbs={[
          { label: 'Pre-Approvals', href: '/pre-approvals' },
          { label: 'New Request' },
        ]}
        actions={
          <button
            onClick={() => navigate('/pre-approvals')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Amount */}
          <div>
            <label
              htmlFor="estimatedAmount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estimated Amount (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              id="estimatedAmount"
              name="estimatedAmount"
              type="number"
              min="1"
              step="1"
              value={form.estimatedAmount}
              onChange={handleChange}
              required
              placeholder="Enter estimated amount"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Purpose */}
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
              Purpose <span className="text-red-500">*</span>
            </label>
            <textarea
              id="purpose"
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe the purpose of this expense..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              If not set, the pre-approval will expire after the default period.
            </p>
          </div>

          {/* Travel Details Toggle */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTravel}
                onChange={(e) => setShowTravel(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Include travel details
              </span>
            </label>
          </div>

          {/* Travel Details Fields */}
          {showTravel && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Travel Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="travelDestination"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Destination
                  </label>
                  <input
                    id="travelDestination"
                    name="travelDestination"
                    type="text"
                    value={form.travelDestination}
                    onChange={handleChange}
                    placeholder="e.g., Dubai"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="travelPurpose"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Travel Purpose
                  </label>
                  <input
                    id="travelPurpose"
                    name="travelPurpose"
                    type="text"
                    value={form.travelPurpose}
                    onChange={handleChange}
                    placeholder="e.g., Client meeting"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="departureDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Departure Date
                  </label>
                  <input
                    id="departureDate"
                    name="departureDate"
                    type="date"
                    value={form.departureDate}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="returnDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Return Date
                  </label>
                  <input
                    id="returnDate"
                    name="returnDate"
                    type="date"
                    value={form.returnDate}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/pre-approvals')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
