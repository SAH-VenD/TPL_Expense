import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { TransferBudgetDto } from './dto/transfer-budget.dto';
import { CheckExpenseDto } from './dto/check-expense.dto';
import { BudgetSummaryQueryDto } from './dto/budget-summary-query.dto';
import {
  BudgetUtilizationDto,
  ExpenseBudgetCheckDto,
  BudgetSummaryDto,
  BudgetTransferResultDto,
  BudgetPeriodDatesDto,
  CurrentPeriodDto,
} from './dto/budget-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleType, BudgetType, BudgetPeriod, User } from '@prisma/client';

@ApiTags('Budgets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // ==================== CRUD OPERATIONS ====================

  @Post()
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created successfully' })
  create(@Body() createBudgetDto: CreateBudgetDto, @CurrentUser() user: User) {
    return this.budgetsService.create(createBudgetDto, user.id);
  }

  @Get()
  @Roles(RoleType.FINANCE, RoleType.ADMIN, RoleType.APPROVER)
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiQuery({ name: 'type', enum: BudgetType, required: false })
  @ApiQuery({
    name: 'activeOnly',
    type: Boolean,
    required: false,
    description: 'Filter by active status',
  })
  findAll(@Query('type') type?: BudgetType, @Query('activeOnly') activeOnly?: string) {
    const isActiveOnly = activeOnly !== 'false';
    return this.budgetsService.findAll(type, isActiveOnly);
  }

  @Get('summary')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get budget summary report with utilization metrics' })
  @ApiResponse({ status: 200, description: 'Budget summary', type: BudgetSummaryDto })
  getBudgetSummary(@Query() query: BudgetSummaryQueryDto): Promise<BudgetSummaryDto> {
    return this.budgetsService.getBudgetSummary(query);
  }

  @Get('period-dates')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Calculate period dates for a budget period type' })
  @ApiQuery({ name: 'periodType', enum: BudgetPeriod, required: true })
  @ApiQuery({ name: 'fiscalYear', type: Number, required: true })
  @ApiQuery({ name: 'quarter', type: Number, required: false })
  @ApiQuery({ name: 'month', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Period dates', type: BudgetPeriodDatesDto })
  getPeriodDates(
    @Query('periodType') periodType: BudgetPeriod,
    @Query('fiscalYear') fiscalYear: string,
    @Query('quarter') quarter?: string,
    @Query('month') month?: string,
  ): BudgetPeriodDatesDto {
    return this.budgetsService.getBudgetPeriodDates(
      periodType,
      Number.parseInt(fiscalYear, 10),
      quarter ? Number.parseInt(quarter, 10) : undefined,
      month ? Number.parseInt(month, 10) : undefined,
    );
  }

  @Get('current-period')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get current period information for a period type' })
  @ApiQuery({ name: 'periodType', enum: BudgetPeriod, required: true })
  @ApiResponse({ status: 200, description: 'Current period info', type: CurrentPeriodDto })
  getCurrentPeriod(@Query('periodType') periodType: BudgetPeriod): CurrentPeriodDto {
    return this.budgetsService.getCurrentPeriod(periodType);
  }

  @Get(':id')
  @Roles(RoleType.FINANCE, RoleType.ADMIN, RoleType.APPROVER)
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.findOne(id);
  }

  @Get(':id/utilization')
  @Roles(RoleType.FINANCE, RoleType.ADMIN, RoleType.APPROVER)
  @ApiOperation({
    summary: 'Get enhanced budget utilization with committed/spent/available breakdown',
  })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({
    status: 200,
    description: 'Budget utilization details',
    type: BudgetUtilizationDto,
  })
  getUtilization(@Param('id', ParseUUIDPipe) id: string): Promise<BudgetUtilizationDto> {
    return this.budgetsService.getUtilization(id);
  }

  @Patch(':id')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Update a budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateBudgetDto: UpdateBudgetDto) {
    return this.budgetsService.update(id, updateBudgetDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Soft delete a budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.remove(id);
  }

  // ==================== BUDGET STATUS MANAGEMENT ====================

  @Post(':id/activate')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Activate a draft/closed budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({ status: 200, description: 'Budget activated successfully' })
  activateBudget(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.budgetsService.activateBudget(id, user.id);
  }

  @Post(':id/close')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Close an active budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({ status: 200, description: 'Budget closed successfully' })
  closeBudget(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.budgetsService.closeBudget(id, user.id);
  }

  @Post(':id/archive')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Archive a closed budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({ status: 200, description: 'Budget archived successfully' })
  archiveBudget(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.budgetsService.archiveBudget(id, user.id);
  }

  // ==================== BUDGET TRANSFERS ====================

  @Post('transfer')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Transfer amount between two budgets' })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
    type: BudgetTransferResultDto,
  })
  transferBudget(
    @Body() transferDto: TransferBudgetDto,
    @CurrentUser() user: User,
  ): Promise<BudgetTransferResultDto> {
    return this.budgetsService.transferBudget(transferDto, user.id);
  }

  // ==================== EXPENSE BUDGET CHECK ====================

  @Post('check-expense')
  @Roles(RoleType.EMPLOYEE, RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Check if an expense fits within applicable budgets' })
  @ApiResponse({ status: 200, description: 'Budget check result', type: ExpenseBudgetCheckDto })
  checkExpense(@Body() checkDto: CheckExpenseDto): Promise<ExpenseBudgetCheckDto> {
    return this.budgetsService.checkExpenseAgainstBudgets(checkDto);
  }
}
