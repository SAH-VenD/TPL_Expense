import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetType, BudgetPeriod, BudgetEnforcement } from '@prisma/client';

// Budget status - conceptual status derived from isActive and dates
export enum BudgetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

// Enforcement action to take
export enum EnforcementAction {
  HARD_BLOCK = 'HARD_BLOCK',
  SOFT_WARNING = 'SOFT_WARNING',
  ESCALATE = 'ESCALATE',
  NONE = 'NONE',
}

export class BudgetUtilizationDto {
  @ApiProperty()
  budgetId: string;

  @ApiProperty()
  budgetName: string;

  @ApiProperty({ enum: BudgetType })
  type: BudgetType;

  @ApiProperty({ enum: BudgetPeriod })
  period: BudgetPeriod;

  @ApiProperty({ description: 'Total allocated amount' })
  allocated: number;

  @ApiProperty({ description: 'Amount committed (PENDING_APPROVAL expenses)' })
  committed: number;

  @ApiProperty({ description: 'Amount spent (APPROVED, PAID expenses)' })
  spent: number;

  @ApiProperty({ description: 'Available amount (allocated - committed - spent)' })
  available: number;

  @ApiProperty({ description: 'Utilization percentage ((committed + spent) / allocated * 100)' })
  utilizationPercentage: number;

  @ApiProperty({ description: 'Whether budget has been exceeded' })
  isOverBudget: boolean;

  @ApiProperty({ description: 'Whether utilization is at or above warning threshold' })
  isAtWarningThreshold: boolean;

  @ApiProperty({ description: 'Warning threshold percentage' })
  warningThreshold: number;

  @ApiProperty({ description: 'Total number of expenses linked to this budget' })
  expenseCount: number;

  @ApiProperty({ description: 'Number of pending approval expenses' })
  pendingCount: number;

  @ApiProperty({ description: 'Budget start date' })
  startDate: Date;

  @ApiProperty({ description: 'Budget end date' })
  endDate: Date;

  @ApiProperty({ enum: BudgetEnforcement })
  enforcement: BudgetEnforcement;
}

export class BudgetCheckResultDto {
  @ApiProperty()
  budgetId: string;

  @ApiProperty()
  budgetName: string;

  @ApiProperty({ description: 'Current utilization percentage before the expense' })
  currentUtilization: number;

  @ApiProperty({ description: 'Projected utilization percentage after the expense' })
  projectedUtilization: number;

  @ApiProperty({ description: 'The expense amount being checked' })
  expenseAmount: number;

  @ApiProperty({ description: 'Available amount before the expense' })
  availableBefore: number;

  @ApiProperty({ description: 'Available amount after the expense' })
  availableAfter: number;

  @ApiProperty({ description: 'Whether the expense would exceed the budget' })
  wouldExceed: boolean;

  @ApiProperty({ description: 'Whether the expense would trigger warning threshold' })
  wouldTriggerWarning: boolean;

  @ApiProperty({ enum: EnforcementAction, description: 'Action to take based on enforcement type' })
  enforcementAction: EnforcementAction;

  @ApiProperty({ description: 'Whether the expense can proceed' })
  canProceed: boolean;

  @ApiPropertyOptional({ description: 'Message to display to user' })
  message?: string;
}

export class ExpenseBudgetCheckDto {
  @ApiProperty({ description: 'Whether the expense is allowed by all applicable budgets' })
  allowed: boolean;

  @ApiProperty({ description: 'Whether any warnings were triggered' })
  hasWarnings: boolean;

  @ApiProperty({ description: 'Whether escalation is required' })
  requiresEscalation: boolean;

  @ApiPropertyOptional({ description: 'Overall message summarizing budget check' })
  message?: string;

  @ApiProperty({
    type: [BudgetCheckResultDto],
    description: 'Individual budget check results',
  })
  budgetResults: BudgetCheckResultDto[];
}

export class BudgetSummaryDto {
  @ApiProperty({ description: 'When the summary was generated' })
  generatedAt: Date;

  @ApiProperty({ description: 'Summary totals' })
  summary: {
    totalBudgets: number;
    totalAllocated: number;
    totalCommitted: number;
    totalSpent: number;
    totalAvailable: number;
    overallUtilization: number;
    budgetsOverThreshold: number;
    budgetsExceeded: number;
    activeBudgets: number;
  };

  @ApiProperty({ type: [BudgetUtilizationDto], description: 'Individual budget utilizations' })
  budgets: BudgetUtilizationDto[];
}

export class BudgetTransferResultDto {
  @ApiProperty({ description: 'Whether the transfer was successful' })
  success: boolean;

  @ApiProperty({ description: 'Message describing the result' })
  message: string;

  @ApiProperty({ description: 'From budget ID' })
  fromBudgetId: string;

  @ApiProperty({ description: 'To budget ID' })
  toBudgetId: string;

  @ApiProperty({ description: 'Amount transferred' })
  amount: number;

  @ApiPropertyOptional({ description: 'New balance of source budget' })
  fromBudgetNewBalance?: number;

  @ApiPropertyOptional({ description: 'New balance of destination budget' })
  toBudgetNewBalance?: number;
}

export class BudgetPeriodDatesDto {
  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;
}

export class CurrentPeriodDto {
  @ApiProperty()
  year: number;

  @ApiPropertyOptional()
  quarter?: number;

  @ApiPropertyOptional()
  month?: number;
}
