import { useState, useEffect } from 'react';
import { PageHeader, Spinner } from '@/components/ui';
import {
  useGetApprovalTiersQuery,
  useCreateApprovalTierMutation,
  useUpdateApprovalTierMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  type ApprovalTier,
  type SystemSettings,
} from '@/features/admin/services/admin.service';

interface TierFormData {
  name: string;
  tierOrder: number;
  minAmount: number;
  maxAmount: number;
  approverRole: string;
}

const ROLE_OPTIONS = [
  { value: 'APPROVER', label: 'Approver' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CEO', label: 'CEO' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'approval-tiers' | 'notifications'>(
    'general',
  );
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<ApprovalTier | null>(null);
  const [tierFormData, setTierFormData] = useState<TierFormData>({
    name: '',
    tierOrder: 1,
    minAmount: 0,
    maxAmount: 0,
    approverRole: 'APPROVER',
  });
  const [tierFormError, setTierFormError] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<SystemSettings>>({});
  const [settingsChanged, setSettingsChanged] = useState(false);

  const { data: approvalTiers, isLoading: tiersLoading } = useGetApprovalTiersQuery();
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const [createTier, { isLoading: isCreatingTier }] = useCreateApprovalTierMutation();
  const [updateTier, { isLoading: isUpdatingTier }] = useUpdateApprovalTierMutation();
  const [updateSettings, { isLoading: isUpdatingSettings }] = useUpdateSettingsMutation();

  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  const handleSettingsChange = (key: keyof SystemSettings, value: unknown) => {
    setSettingsForm((prev) => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settingsForm).unwrap();
      setSettingsChanged(false);
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      alert(error.data?.message || 'Failed to save settings');
    }
  };

  const resetTierForm = () => {
    setTierFormData({
      name: '',
      tierOrder: (approvalTiers?.length || 0) + 1,
      minAmount: 0,
      maxAmount: 0,
      approverRole: 'APPROVER',
    });
    setTierFormError(null);
  };

  const handleOpenEditTier = (tier: ApprovalTier) => {
    setTierFormData({
      name: tier.name,
      tierOrder: tier.tierOrder,
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount || 999999999,
      approverRole: tier.approverRole,
    });
    setTierFormError(null);
    setEditingTier(tier);
    setShowTierModal(true);
  };

  const handleCloseTierModal = () => {
    setShowTierModal(false);
    setEditingTier(null);
    resetTierForm();
  };

  const handleSubmitTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setTierFormError(null);

    try {
      if (editingTier) {
        await updateTier({ id: editingTier.id, data: tierFormData }).unwrap();
      } else {
        await createTier(tierFormData).unwrap();
      }
      handleCloseTierModal();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setTierFormError(error.data?.message || 'Failed to save approval tier');
    }
  };

  if (tiersLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure application settings and preferences"
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Settings' }]}
      />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', name: 'General' },
            { id: 'approval-tiers', name: 'Approval Tiers' },
            { id: 'notifications', name: 'Notifications' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settingsForm.sessionTimeoutMinutes || ''}
                onChange={(e) =>
                  handleSettingsChange('sessionTimeoutMinutes', Number(e.target.value))
                }
                min="1"
                max="60"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settingsForm.maxLoginAttempts || ''}
                onChange={(e) => handleSettingsChange('maxLoginAttempts', Number(e.target.value))}
                min="1"
                max="10"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={settingsForm.lockoutDurationMinutes || ''}
                onChange={(e) =>
                  handleSettingsChange('lockoutDurationMinutes', Number(e.target.value))
                }
                min="1"
                max="60"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Submission Deadline (days)
              </label>
              <input
                type="number"
                value={settingsForm.expenseSubmissionDeadlineDays || ''}
                onChange={(e) =>
                  handleSettingsChange('expenseSubmissionDeadlineDays', Number(e.target.value))
                }
                min="1"
                max="30"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voucher Settlement Deadline (days)
              </label>
              <input
                type="number"
                value={settingsForm.voucherSettlementDeadlineDays || ''}
                onChange={(e) =>
                  handleSettingsChange('voucherSettlementDeadlineDays', Number(e.target.value))
                }
                min="1"
                max="90"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Warning Threshold (%)
              </label>
              <input
                type="number"
                value={settingsForm.budgetWarningThreshold || ''}
                onChange={(e) =>
                  handleSettingsChange('budgetWarningThreshold', Number(e.target.value))
                }
                min="50"
                max="100"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="pt-4 border-t">
            <button
              onClick={handleSaveSettings}
              disabled={!settingsChanged || isUpdatingSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUpdatingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'approval-tiers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Configure approval tiers based on expense amounts.</p>
            <button
              onClick={() => {
                resetTierForm();
                setShowTierModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Tier
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {!approvalTiers || approvalTiers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No approval tiers configured.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Approver Role
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvalTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-medium">
                          {tier.tierOrder}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{tier.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        PKR {tier.minAmount.toLocaleString()} -{' '}
                        {!tier.maxAmount || tier.maxAmount >= 999999999
                          ? 'No limit'
                          : `PKR ${tier.maxAmount.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{tier.approverRole}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEditTier(tier)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
          <p className="text-sm text-gray-500">
            Notification settings are managed at the user level.
          </p>
          <div className="space-y-4">
            {[
              {
                id: 'expense_submitted',
                label: 'Expense Submitted',
                description: 'Notify approvers when expense is submitted',
              },
              {
                id: 'expense_approved',
                label: 'Expense Approved',
                description: 'Notify submitter when expense is approved',
              },
              {
                id: 'expense_rejected',
                label: 'Expense Rejected',
                description: 'Notify submitter when expense is rejected',
              },
              {
                id: 'voucher_approved',
                label: 'Voucher Approved',
                description: 'Notify requester when voucher is approved',
              },
              {
                id: 'budget_warning',
                label: 'Budget Warning',
                description: 'Notify budget owner when threshold is reached',
              },
            ].map((n) => (
              <div key={n.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={n.id}
                  defaultChecked
                  disabled
                  className="mt-1 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor={n.id} className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{n.label}</p>
                  <p className="text-sm text-gray-500">{n.description}</p>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTier ? 'Edit Approval Tier' : 'Add Approval Tier'}
            </h3>
            {tierFormError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {tierFormError}
              </div>
            )}
            <form onSubmit={handleSubmitTier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name *</label>
                <input
                  type="text"
                  value={tierFormData.name}
                  onChange={(e) => setTierFormData({ ...tierFormData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier Order *</label>
                <input
                  type="number"
                  value={tierFormData.tierOrder}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, tierOrder: Number(e.target.value) })
                  }
                  required
                  min="1"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    value={tierFormData.minAmount}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, minAmount: Number(e.target.value) })
                    }
                    required
                    min="0"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    value={tierFormData.maxAmount}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, maxAmount: Number(e.target.value) })
                    }
                    required
                    min="0"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approver Role *
                </label>
                <select
                  value={tierFormData.approverRole}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, approverRole: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseTierModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTier || isUpdatingTier}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingTier || isUpdatingTier
                    ? 'Saving...'
                    : editingTier
                      ? 'Save Changes'
                      : 'Add Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
