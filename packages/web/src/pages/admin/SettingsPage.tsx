import { useState } from 'react';

interface ApprovalTier {
  id: string;
  name: string;
  tierOrder: number;
  minAmount: number;
  maxAmount: number;
  approverRole: string;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'approval-tiers' | 'notifications'>('general');
  const [showTierModal, setShowTierModal] = useState(false);

  // Mock data
  const settings = {
    companyName: 'Tekcellent',
    emailDomain: 'tekcellent.com',
    sessionTimeoutMinutes: 5,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    expenseDeadlineDays: 10,
    voucherSettlementDays: 30,
    budgetWarningThreshold: 80,
    defaultCurrency: 'PKR',
  };

  const approvalTiers: ApprovalTier[] = [
    {
      id: '1',
      name: 'Tier 1 - Manager',
      tierOrder: 1,
      minAmount: 0,
      maxAmount: 25000,
      approverRole: 'Manager',
    },
    {
      id: '2',
      name: 'Tier 2 - Department Head',
      tierOrder: 2,
      minAmount: 25000,
      maxAmount: 100000,
      approverRole: 'Department Head',
    },
    {
      id: '3',
      name: 'Tier 3 - Finance',
      tierOrder: 3,
      minAmount: 100000,
      maxAmount: 250000,
      approverRole: 'Finance',
    },
    {
      id: '4',
      name: 'Tier 4 - CFO',
      tierOrder: 4,
      minAmount: 250000,
      maxAmount: 999999999,
      approverRole: 'CFO',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

      {/* Tabs */}
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

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                defaultValue={settings.companyName}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed Email Domain
              </label>
              <input
                type="text"
                defaultValue={settings.emailDomain}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                defaultValue={settings.sessionTimeoutMinutes}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                defaultValue={settings.maxLoginAttempts}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                defaultValue={settings.lockoutDurationMinutes}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Submission Deadline (days)
              </label>
              <input
                type="number"
                defaultValue={settings.expenseDeadlineDays}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voucher Settlement Deadline (days)
              </label>
              <input
                type="number"
                defaultValue={settings.voucherSettlementDays}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Warning Threshold (%)
              </label>
              <input
                type="number"
                defaultValue={settings.budgetWarningThreshold}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Currency
              </label>
              <select
                defaultValue={settings.defaultCurrency}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="PKR">PKR - Pakistani Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="SAR">SAR - Saudi Riyal</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Approval Tiers */}
      {activeTab === 'approval-tiers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Configure approval tiers based on expense amounts.
            </p>
            <button
              onClick={() => setShowTierModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Tier
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approver Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {tier.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      PKR {tier.minAmount.toLocaleString()} -{' '}
                      {tier.maxAmount >= 999999999
                        ? 'No limit'
                        : `PKR ${tier.maxAmount.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tier.approverRole}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 mr-4">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
          <div className="space-y-4">
            {[
              { id: 'expense_submitted', label: 'Expense Submitted', description: 'Notify approvers when expense is submitted' },
              { id: 'expense_approved', label: 'Expense Approved', description: 'Notify submitter when expense is approved' },
              { id: 'expense_rejected', label: 'Expense Rejected', description: 'Notify submitter when expense is rejected' },
              { id: 'clarification_requested', label: 'Clarification Requested', description: 'Notify submitter when clarification is needed' },
              { id: 'voucher_approved', label: 'Voucher Approved', description: 'Notify requester when voucher is approved' },
              { id: 'voucher_overdue', label: 'Voucher Overdue', description: 'Remind requester when voucher is overdue' },
              { id: 'budget_warning', label: 'Budget Warning', description: 'Notify budget owner when threshold is reached' },
            ].map((notification) => (
              <div key={notification.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={notification.id}
                  defaultChecked
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={notification.id} className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.label}
                  </p>
                  <p className="text-sm text-gray-500">{notification.description}</p>
                </label>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Add Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Approval Tier
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tier Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Amount (PKR)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Amount (PKR)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approver Role
                </label>
                <select className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="APPROVER">Approver</option>
                  <option value="FINANCE">Finance</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTierModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
