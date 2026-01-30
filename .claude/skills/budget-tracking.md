# Skill: Budget Tracking

## Context
This skill contains the business rules and implementation patterns for budget management, including budget creation, tracking, enforcement, and reporting. Reference this when implementing budget-related functionality.

---

## Core Concepts

### Budget Dimensions

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUDGET HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Organization Budget (Annual)                                   │
│       │                                                          │
│       ├── Department Budget (Quarterly)                          │
│       │       │                                                  │
│       │       ├── Project Budget                                 │
│       │       │                                                  │
│       │       ├── Cost Center Budget                             │
│       │       │                                                  │
│       │       └── Category Budget (e.g., Travel)                 │
│       │                                                          │
│       └── Employee Budget (optional)                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Budget Types

| Type | Description | Typical Period |
|------|-------------|----------------|
| **ORGANIZATION** | Company-wide spending limit | Annual |
| **DEPARTMENT** | Per-department allocation | Quarterly/Annual |
| **PROJECT** | Client/project-specific budget | Project duration |
| **COST_CENTER** | Operational cost tracking | Quarterly |
| **CATEGORY** | Category-specific limits (e.g., Travel) | Monthly/Quarterly |
| **EMPLOYEE** | Individual spending limits | Monthly |

---

## Data Models

### Budget Entity

```typescript
interface Budget {
  id: string;

  // Identity
  name: string;
  code: string;                    // Short code (e.g., "ENG-Q1-2026")
  description?: string;

  // Type & Scope
  type: BudgetType;
  referenceId: string;             // Department ID, Project ID, etc.

  // Period
  periodType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'PROJECT';
  fiscalYear?: number;
  quarter?: 1 | 2 | 3 | 4;
  month?: number;
  startDate: Date;
  endDate: Date;

  // Amounts (in base currency PKR)
  allocatedAmount: number;

  // Thresholds & Enforcement
  warningThreshold: number;        // Percentage (e.g., 80)
  enforcement: BudgetEnforcement;

  // Hierarchy
  parentBudgetId?: string;         // For hierarchical budgets

  // Ownership
  ownerId: string;                 // Budget owner (Finance user)
  createdById: string;

  // Status
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

enum BudgetType {
  ORGANIZATION = 'ORGANIZATION',
  DEPARTMENT = 'DEPARTMENT',
  PROJECT = 'PROJECT',
  COST_CENTER = 'COST_CENTER',
  CATEGORY = 'CATEGORY',
  EMPLOYEE = 'EMPLOYEE',
}

enum BudgetEnforcement {
  HARD_BLOCK = 'HARD_BLOCK',       // Block submission when exceeded
  SOFT_WARNING = 'SOFT_WARNING',   // Allow with warning flag
  ESCALATE = 'ESCALATE',           // Require higher approval
  NONE = 'NONE',                   // Track only, no enforcement
}
```

### Budget Utilization Entity

```typescript
interface BudgetUtilization {
  id: string;
  budgetId: string;

  // Period tracking (for historical snapshots)
  snapshotDate: Date;

  // Amounts
  allocatedAmount: number;
  committedAmount: number;         // Pending approval expenses
  spentAmount: number;             // Approved expenses
  availableAmount: number;         // Calculated: allocated - committed - spent

  // Percentages
  utilizationPercentage: number;   // (committed + spent) / allocated * 100

  // Counts
  expenseCount: number;
  pendingExpenseCount: number;

  createdAt: Date;
}
```

---

## Budget Calculations

### Real-Time Utilization

```typescript
@Injectable()
export class BudgetCalculationService {
  constructor(private prisma: PrismaService) {}

  async calculateUtilization(budgetId: string): Promise<BudgetUtilizationResult> {
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });

    // Get all expenses linked to this budget
    const expenses = await this.prisma.expense.findMany({
      where: {
        budgetId,
        expenseDate: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        status: { not: ExpenseStatus.DELETED },
      },
    });

    // Calculate amounts by status
    const committed = expenses
      .filter(e => e.status === ExpenseStatus.PENDING_APPROVAL)
      .reduce((sum, e) => sum + e.pkrAmount, 0);

    const spent = expenses
      .filter(e => [ExpenseStatus.APPROVED, ExpenseStatus.SETTLED].includes(e.status))
      .reduce((sum, e) => sum + e.pkrAmount, 0);

    const available = budget.allocatedAmount - committed - spent;
    const utilization = ((committed + spent) / budget.allocatedAmount) * 100;

    return {
      budgetId,
      budgetName: budget.name,
      allocated: budget.allocatedAmount,
      committed,
      spent,
      available,
      utilizationPercentage: Math.round(utilization * 100) / 100,
      isOverBudget: available < 0,
      isAtWarningThreshold: utilization >= budget.warningThreshold,
      warningThreshold: budget.warningThreshold,
      expenseCount: expenses.length,
      pendingCount: expenses.filter(e => e.status === ExpenseStatus.PENDING_APPROVAL).length,
    };
  }

  async checkBudgetForExpense(
    expense: Expense,
    budgetId: string
  ): Promise<BudgetCheckResult> {
    const utilization = await this.calculateUtilization(budgetId);
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });

    const newTotal = utilization.committed + utilization.spent + expense.pkrAmount;
    const newUtilization = (newTotal / budget.allocatedAmount) * 100;
    const wouldExceed = newTotal > budget.allocatedAmount;
    const wouldTriggerWarning = newUtilization >= budget.warningThreshold;

    return {
      budgetId,
      budgetName: budget.name,
      currentUtilization: utilization.utilizationPercentage,
      projectedUtilization: Math.round(newUtilization * 100) / 100,
      expenseAmount: expense.pkrAmount,
      availableBefore: utilization.available,
      availableAfter: budget.allocatedAmount - newTotal,
      wouldExceed,
      wouldTriggerWarning,
      enforcement: budget.enforcement,
      canProceed: this.canProceed(budget.enforcement, wouldExceed),
      message: this.getCheckMessage(budget, wouldExceed, wouldTriggerWarning),
    };
  }

  private canProceed(enforcement: BudgetEnforcement, wouldExceed: boolean): boolean {
    if (!wouldExceed) return true;

    switch (enforcement) {
      case BudgetEnforcement.HARD_BLOCK:
        return false;
      case BudgetEnforcement.SOFT_WARNING:
      case BudgetEnforcement.ESCALATE:
      case BudgetEnforcement.NONE:
        return true;
    }
  }

  private getCheckMessage(
    budget: Budget,
    wouldExceed: boolean,
    wouldTriggerWarning: boolean
  ): string {
    if (wouldExceed) {
      switch (budget.enforcement) {
        case BudgetEnforcement.HARD_BLOCK:
          return `Cannot submit: This expense would exceed budget "${budget.name}"`;
        case BudgetEnforcement.SOFT_WARNING:
          return `Warning: This expense will exceed budget "${budget.name}"`;
        case BudgetEnforcement.ESCALATE:
          return `This expense exceeds budget "${budget.name}" and will require additional approval`;
        default:
          return `Note: This expense will exceed budget "${budget.name}"`;
      }
    }

    if (wouldTriggerWarning) {
      return `Warning: Budget "${budget.name}" will reach ${budget.warningThreshold}% utilization`;
    }

    return null;
  }
}
```

---

## Budget Assignment

### Automatic Budget Detection

```typescript
async function findApplicableBudgets(expense: Expense): Promise<Budget[]> {
  const budgets: Budget[] = [];
  const now = expense.expenseDate;

  // 1. Check for explicit budget assignment
  if (expense.budgetId) {
    const budget = await this.prisma.budget.findUnique({ where: { id: expense.budgetId } });
    if (budget) budgets.push(budget);
  }

  // 2. Check department budget
  const deptBudget = await this.prisma.budget.findFirst({
    where: {
      type: BudgetType.DEPARTMENT,
      referenceId: expense.departmentId,
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
  if (deptBudget) budgets.push(deptBudget);

  // 3. Check project budget (if project assigned)
  if (expense.projectId) {
    const projectBudget = await this.prisma.budget.findFirst({
      where: {
        type: BudgetType.PROJECT,
        referenceId: expense.projectId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (projectBudget) budgets.push(projectBudget);
  }

  // 4. Check cost center budget
  if (expense.costCenterId) {
    const ccBudget = await this.prisma.budget.findFirst({
      where: {
        type: BudgetType.COST_CENTER,
        referenceId: expense.costCenterId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (ccBudget) budgets.push(ccBudget);
  }

  // 5. Check category budget
  const categoryBudget = await this.prisma.budget.findFirst({
    where: {
      type: BudgetType.CATEGORY,
      referenceId: expense.categoryId,
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
  if (categoryBudget) budgets.push(categoryBudget);

  return budgets;
}
```

---

## Budget Period Management

### Period Calculations

```typescript
function getBudgetPeriodDates(
  periodType: string,
  fiscalYear: number,
  quarter?: number,
  month?: number
): { startDate: Date; endDate: Date } {
  switch (periodType) {
    case 'ANNUAL':
      // Assuming fiscal year = calendar year
      return {
        startDate: new Date(fiscalYear, 0, 1),    // Jan 1
        endDate: new Date(fiscalYear, 11, 31),    // Dec 31
      };

    case 'QUARTERLY':
      const qStartMonth = (quarter - 1) * 3;
      return {
        startDate: new Date(fiscalYear, qStartMonth, 1),
        endDate: new Date(fiscalYear, qStartMonth + 3, 0), // Last day of quarter
      };

    case 'MONTHLY':
      return {
        startDate: new Date(fiscalYear, month - 1, 1),
        endDate: new Date(fiscalYear, month, 0), // Last day of month
      };

    default:
      throw new Error(`Unknown period type: ${periodType}`);
  }
}

function getCurrentPeriod(periodType: string): { year: number; quarter?: number; month?: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);

  switch (periodType) {
    case 'ANNUAL':
      return { year };
    case 'QUARTERLY':
      return { year, quarter };
    case 'MONTHLY':
      return { year, month };
    default:
      return { year };
  }
}
```

---

## Budget Notifications

### Threshold Alerts

```typescript
const BUDGET_NOTIFICATION_THRESHOLDS = [
  { percentage: 50, type: 'INFO', message: 'Budget is 50% utilized' },
  { percentage: 75, type: 'WARNING', message: 'Budget is 75% utilized' },
  { percentage: 90, type: 'CRITICAL', message: 'Budget is 90% utilized' },
  { percentage: 100, type: 'ALERT', message: 'Budget has been exceeded' },
];

async function checkBudgetThresholds(budgetId: string): Promise<void> {
  const utilization = await this.calculateUtilization(budgetId);
  const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });

  for (const threshold of BUDGET_NOTIFICATION_THRESHOLDS) {
    if (utilization.utilizationPercentage >= threshold.percentage) {
      // Check if notification already sent for this threshold
      const alreadySent = await this.prisma.budgetNotification.findFirst({
        where: {
          budgetId,
          thresholdPercentage: threshold.percentage,
          periodStart: budget.startDate,
        },
      });

      if (!alreadySent) {
        await this.sendBudgetNotification(budget, threshold, utilization);

        // Record that notification was sent
        await this.prisma.budgetNotification.create({
          data: {
            budgetId,
            thresholdPercentage: threshold.percentage,
            periodStart: budget.startDate,
            sentAt: new Date(),
          },
        });
      }
    }
  }
}
```

---

## Budget Reports

### Report Queries

```typescript
interface BudgetReportParams {
  budgetIds?: string[];
  departmentIds?: string[];
  periodType?: string;
  fiscalYear?: number;
  quarter?: number;
  includeChildren?: boolean;
}

async function generateBudgetReport(
  params: BudgetReportParams
): Promise<BudgetReport> {
  const budgets = await this.findBudgets(params);

  const report: BudgetReport = {
    generatedAt: new Date(),
    period: this.formatPeriod(params),
    summary: {
      totalAllocated: 0,
      totalCommitted: 0,
      totalSpent: 0,
      totalAvailable: 0,
      overallUtilization: 0,
      budgetsOverThreshold: 0,
      budgetsExceeded: 0,
    },
    budgets: [],
  };

  for (const budget of budgets) {
    const utilization = await this.calculateUtilization(budget.id);

    report.budgets.push({
      budget,
      utilization,
      trend: await this.calculateTrend(budget.id),
      topExpenseCategories: await this.getTopCategories(budget.id, 5),
    });

    // Update summary
    report.summary.totalAllocated += budget.allocatedAmount;
    report.summary.totalCommitted += utilization.committed;
    report.summary.totalSpent += utilization.spent;
    report.summary.totalAvailable += utilization.available;

    if (utilization.isAtWarningThreshold) {
      report.summary.budgetsOverThreshold++;
    }
    if (utilization.isOverBudget) {
      report.summary.budgetsExceeded++;
    }
  }

  report.summary.overallUtilization =
    ((report.summary.totalCommitted + report.summary.totalSpent) /
     report.summary.totalAllocated) * 100;

  return report;
}
```

---

## Budget Adjustments

### Transfer Between Budgets

```typescript
async function transferBudget(
  fromBudgetId: string,
  toBudgetId: string,
  amount: number,
  reason: string,
  userId: string
): Promise<void> {
  const fromBudget = await this.prisma.budget.findUnique({ where: { id: fromBudgetId } });
  const toBudget = await this.prisma.budget.findUnique({ where: { id: toBudgetId } });

  // Validate transfer
  const fromUtilization = await this.calculateUtilization(fromBudgetId);
  if (fromUtilization.available < amount) {
    throw new BadRequestException(
      `Insufficient available budget. Available: ${fromUtilization.available}`
    );
  }

  // Use transaction for atomic update
  await this.prisma.$transaction(async (tx) => {
    // Reduce source budget
    await tx.budget.update({
      where: { id: fromBudgetId },
      data: { allocatedAmount: fromBudget.allocatedAmount - amount },
    });

    // Increase destination budget
    await tx.budget.update({
      where: { id: toBudgetId },
      data: { allocatedAmount: toBudget.allocatedAmount + amount },
    });

    // Record transactions
    await tx.budgetTransaction.create({
      data: {
        budgetId: fromBudgetId,
        transactionType: 'TRANSFER_OUT',
        amount: -amount,
        notes: `Transfer to ${toBudget.name}: ${reason}`,
        createdById: userId,
      },
    });

    await tx.budgetTransaction.create({
      data: {
        budgetId: toBudgetId,
        transactionType: 'TRANSFER_IN',
        amount: amount,
        notes: `Transfer from ${fromBudget.name}: ${reason}`,
        createdById: userId,
      },
    });
  });
}
```

---

## Best Practices

### Budget Creation Checklist

- [ ] Define clear budget period (start/end dates)
- [ ] Set appropriate warning threshold (typically 80%)
- [ ] Choose correct enforcement level
- [ ] Assign budget owner
- [ ] Link to correct dimension (department, project, etc.)
- [ ] Consider setting up child budgets for detailed tracking

### Budget Monitoring

- [ ] Review budget utilization weekly
- [ ] Investigate expenses when warning threshold reached
- [ ] Adjust budgets proactively when trends indicate overage
- [ ] Close/archive budgets at period end
- [ ] Roll over or reallocate unused budget as needed
