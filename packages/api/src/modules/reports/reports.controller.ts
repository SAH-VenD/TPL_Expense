import { Controller, Get, Post, Body, UseGuards, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ExportReportDto } from './dto/export-report.dto';
import {
  ReportQueryDto,
  MonthlyTrendQueryDto,
  ApprovalTurnaroundQueryDto,
  ReimbursementStatusQueryDto,
  DashboardQueryDto,
} from './dto/report-query.dto';
import {
  SpendByEmployeeReportDto,
  SpendByProjectReportDto,
  SpendByCostCenterReportDto,
  MonthlyTrendReportDto,
  ApprovalTurnaroundReportDto,
  ReimbursementStatusReportDto,
  DashboardSummaryReportDto,
} from './dto/report-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleType, User } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  RoleType.EMPLOYEE,
  RoleType.APPROVER,
  RoleType.SUPER_APPROVER,
  RoleType.FINANCE,
  RoleType.CEO,
  RoleType.ADMIN,
)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ==================== EXISTING ENDPOINTS ====================

  @Get('spend-by-department')
  @ApiOperation({ summary: 'Get spend by department report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: 200, description: 'Spend by department data' })
  getSpendByDepartment(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSpendByDepartment(startDate, endDate);
  }

  @Get('spend-by-category')
  @ApiOperation({ summary: 'Get spend by category report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: 200, description: 'Spend by category data' })
  getSpendByCategory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: User,
  ) {
    return this.reportsService.getSpendByCategory(startDate, endDate, user);
  }

  @Get('spend-by-vendor')
  @ApiOperation({ summary: 'Get spend by vendor report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: 200, description: 'Spend by vendor data' })
  getSpendByVendor(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSpendByVendor(startDate, endDate);
  }

  @Get('budget-vs-actual')
  @ApiOperation({ summary: 'Get budget vs actual report' })
  @ApiResponse({ status: 200, description: 'Budget vs actual comparison data' })
  getBudgetVsActual() {
    return this.reportsService.getBudgetVsActual();
  }

  @Get('outstanding-advances')
  @ApiOperation({ summary: 'Get outstanding advances report' })
  @ApiResponse({ status: 200, description: 'Outstanding advances (disbursed vouchers)' })
  getOutstandingAdvances() {
    return this.reportsService.getOutstandingAdvances();
  }

  @Get('tax-summary')
  @ApiOperation({ summary: 'Get tax summary report (FBR compliance)' })
  @ApiQuery({ name: 'year', required: false, description: 'Fiscal year (defaults to current)' })
  @ApiResponse({ status: 200, description: 'Tax summary with breakdown by tax type' })
  getTaxSummary(@Query('year') year?: number) {
    return this.reportsService.getTaxSummary(year);
  }

  // ==================== NEW ENDPOINTS ====================

  @Get('spend-by-employee')
  @ApiOperation({ summary: 'Get spend by employee report' })
  @ApiOkResponse({ type: SpendByEmployeeReportDto, description: 'Employee expense breakdown' })
  getSpendByEmployee(@Query() query: ReportQueryDto): Promise<SpendByEmployeeReportDto> {
    return this.reportsService.getSpendByEmployee(query);
  }

  @Get('spend-by-project')
  @ApiOperation({ summary: 'Get spend by project report' })
  @ApiOkResponse({ type: SpendByProjectReportDto, description: 'Project expense breakdown' })
  getSpendByProject(@Query() query: ReportQueryDto): Promise<SpendByProjectReportDto> {
    return this.reportsService.getSpendByProject(query);
  }

  @Get('spend-by-cost-center')
  @ApiOperation({ summary: 'Get spend by cost center report' })
  @ApiOkResponse({ type: SpendByCostCenterReportDto, description: 'Cost center expense breakdown' })
  getSpendByCostCenter(@Query() query: ReportQueryDto): Promise<SpendByCostCenterReportDto> {
    return this.reportsService.getSpendByCostCenter(query);
  }

  @Get('monthly-trend')
  @ApiOperation({ summary: 'Get monthly expense trend report' })
  @ApiOkResponse({ type: MonthlyTrendReportDto, description: 'Monthly expense trend data' })
  getMonthlyTrend(
    @Query() query: MonthlyTrendQueryDto,
    @CurrentUser() user?: User,
  ): Promise<MonthlyTrendReportDto> {
    return this.reportsService.getMonthlyTrend(query, user);
  }

  @Get('approval-turnaround')
  @ApiOperation({ summary: 'Get approval turnaround time report' })
  @ApiOkResponse({
    type: ApprovalTurnaroundReportDto,
    description: 'Approval time statistics',
  })
  getApprovalTurnaround(
    @Query() query: ApprovalTurnaroundQueryDto,
  ): Promise<ApprovalTurnaroundReportDto> {
    return this.reportsService.getApprovalTurnaround(query);
  }

  @Get('reimbursement-status')
  @ApiOperation({ summary: 'Get reimbursement status report' })
  @ApiOkResponse({
    type: ReimbursementStatusReportDto,
    description: 'Paid vs pending expense summary',
  })
  getReimbursementStatus(
    @Query() query: ReimbursementStatusQueryDto,
  ): Promise<ReimbursementStatusReportDto> {
    return this.reportsService.getReimbursementStatus(query);
  }

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get executive dashboard summary' })
  @ApiOkResponse({
    type: DashboardSummaryReportDto,
    description: 'Key metrics for executive dashboard',
  })
  getDashboardSummary(
    @Query() query: DashboardQueryDto,
    @CurrentUser() user?: User,
  ): Promise<DashboardSummaryReportDto> {
    return this.reportsService.getDashboardSummary(query, user);
  }

  // ==================== EXPORT ====================

  @Post('export')
  @ApiOperation({ summary: 'Export a report to file (XLSX, CSV, or PDF)' })
  @ApiResponse({
    status: 200,
    description: 'File download',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
      'text/csv': {},
      'application/pdf': {},
    },
  })
  async exportReport(@Body() exportDto: ExportReportDto, @Res() res: Response) {
    const file = await this.reportsService.exportReport(exportDto);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }
}
