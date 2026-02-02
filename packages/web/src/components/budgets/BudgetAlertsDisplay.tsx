import React, { useState } from 'react';
import clsx from 'clsx';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import type { Budget, BudgetEnforcement } from '@/features/budgets/services/budgets.service';

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'exceeded';
  threshold: number;
  currentValue: number;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface BudgetAlertsDisplayProps {
  budget: Budget;
  utilizationPercent?: number;
  alerts: BudgetAlert[];
  isAdmin: boolean;
  onThresholdUpdate?: (warningThreshold: number, enforcement: BudgetEnforcement) => Promise<void>;
  onAcknowledge?: (alertId: string) => Promise<void>;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-PK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const enforcementOptions = [
  { value: 'SOFT_WARNING', label: 'Soft Warning - Allow submission with warning' },
  { value: 'HARD_BLOCK', label: 'Hard Block - Prevent submission' },
  { value: 'AUTO_ESCALATE', label: 'Auto Escalate - Require additional approval' },
];

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'exceeded':
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    case 'critical':
      return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
    default:
      return <BellIcon className="h-5 w-5 text-gray-500" />;
  }
};

const getAlertColor = (type: string) => {
  switch (type) {
    case 'exceeded':
      return 'bg-red-50 border-red-200';
    case 'critical':
      return 'bg-orange-50 border-orange-200';
    case 'warning':
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getAlertLabel = (type: string) => {
  switch (type) {
    case 'exceeded':
      return 'Budget Exceeded';
    case 'critical':
      return 'Critical Threshold (90%)';
    case 'warning':
      return 'Warning Threshold';
    default:
      return 'Alert';
  }
};

export const BudgetAlertsDisplay: React.FC<BudgetAlertsDisplayProps> = ({
  budget,
  utilizationPercent: utilizationPercentProp,
  alerts,
  isAdmin,
  onThresholdUpdate,
  onAcknowledge,
}) => {
  const [warningThreshold, setWarningThreshold] = useState(budget.warningThreshold);
  const [enforcement, setEnforcement] = useState<BudgetEnforcement>(budget.enforcement);
  const [isSaving, setIsSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const utilizationPercent = utilizationPercentProp ?? 0;
  const isWarning = utilizationPercent >= budget.warningThreshold;
  const isCritical = utilizationPercent >= 90;
  const isExceeded = utilizationPercent > 100;

  const handleSaveThreshold = async () => {
    if (!onThresholdUpdate) return;
    setIsSaving(true);
    try {
      await onThresholdUpdate(warningThreshold, enforcement);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    if (!onAcknowledge) return;
    setAcknowledging(alertId);
    try {
      await onAcknowledge(alertId);
    } finally {
      setAcknowledging(null);
    }
  };

  // Sort alerts: unacknowledged first, then by date
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (!a.acknowledgedAt && b.acknowledgedAt) return -1;
    if (a.acknowledgedAt && !b.acknowledgedAt) return 1;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Current Alert Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Warning Status */}
        <Card
          className={clsx(
            'border-2',
            isWarning && !isCritical && !isExceeded
              ? 'border-amber-400 bg-amber-50'
              : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'p-2 rounded-full',
                isWarning && !isCritical && !isExceeded
                  ? 'bg-amber-100'
                  : 'bg-gray-100'
              )}
            >
              <ExclamationTriangleIcon
                className={clsx(
                  'h-6 w-6',
                  isWarning && !isCritical && !isExceeded
                    ? 'text-amber-600'
                    : 'text-gray-400'
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Warning Threshold
              </p>
              <p className="text-lg font-bold">
                {budget.warningThreshold}%
              </p>
              <p className="text-xs text-gray-500">
                Current: {utilizationPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        {/* Critical Status */}
        <Card
          className={clsx(
            'border-2',
            isCritical && !isExceeded
              ? 'border-orange-400 bg-orange-50'
              : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'p-2 rounded-full',
                isCritical && !isExceeded ? 'bg-orange-100' : 'bg-gray-100'
              )}
            >
              <ExclamationTriangleIcon
                className={clsx(
                  'h-6 w-6',
                  isCritical && !isExceeded ? 'text-orange-600' : 'text-gray-400'
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Critical Threshold
              </p>
              <p className="text-lg font-bold">90%</p>
              <p className="text-xs text-gray-500">
                {isCritical ? 'Triggered' : 'Not triggered'}
              </p>
            </div>
          </div>
        </Card>

        {/* Exceeded Status */}
        <Card
          className={clsx(
            'border-2',
            isExceeded ? 'border-red-400 bg-red-50' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'p-2 rounded-full',
                isExceeded ? 'bg-red-100' : 'bg-gray-100'
              )}
            >
              {isExceeded ? (
                <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircleIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Budget Status</p>
              <p
                className={clsx(
                  'text-lg font-bold',
                  isExceeded ? 'text-red-600' : 'text-green-600'
                )}
              >
                {isExceeded ? 'Exceeded' : 'Within Budget'}
              </p>
              <p className="text-xs text-gray-500">
                {isExceeded
                  ? `${(utilizationPercent - 100).toFixed(1)}% over`
                  : `${(100 - utilizationPercent).toFixed(1)}% remaining`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alert History */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alert History
          </h3>
          <div className="space-y-3">
            {sortedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-lg border',
                  getAlertColor(alert.type)
                )}
              >
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {getAlertLabel(alert.type)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Triggered at {alert.currentValue.toFixed(1)}% utilization
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(alert.triggeredAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {alert.acknowledgedAt ? (
                    <div className="text-xs text-gray-500">
                      <p>Acknowledged</p>
                      <p>{formatDate(alert.acknowledgedAt)}</p>
                      {alert.acknowledgedBy && (
                        <p className="text-gray-400">by {alert.acknowledgedBy}</p>
                      )}
                    </div>
                  ) : onAcknowledge ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledging === alert.id}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      {acknowledging === alert.id ? 'Acknowledging...' : 'Acknowledge'}
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threshold Configuration (Admin Only) */}
      {isAdmin && onThresholdUpdate && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alert Configuration
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Warning Threshold (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={warningThreshold}
                  onChange={(e) =>
                    setWarningThreshold(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  helperText="Percentage of budget usage to trigger warning"
                />
              </div>
              <div>
                <Select
                  label="Enforcement Level"
                  options={enforcementOptions}
                  value={enforcement}
                  onChange={(value) => setEnforcement(value as BudgetEnforcement)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveThreshold}
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Notification Settings
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Budget alerts are sent to the following recipients:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Budget owner/manager</li>
          <li>Department head (for department budgets)</li>
          <li>Finance team members</li>
          <li>System administrators</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Notifications are delivered via email and in-app notifications.
        </p>
      </div>
    </div>
  );
};

BudgetAlertsDisplay.displayName = 'BudgetAlertsDisplay';
