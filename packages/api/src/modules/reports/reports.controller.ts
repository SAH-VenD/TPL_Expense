import { Controller, Get, Post, Body, UseGuards, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ExportReportDto } from './dto/export-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.FINANCE, RoleType.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('spend-by-department')
  @ApiOperation({ summary: 'Get spend by department report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSpendByDepartment(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSpendByDepartment(startDate, endDate);
  }

  @Get('spend-by-category')
  @ApiOperation({ summary: 'Get spend by category report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSpendByCategory(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSpendByCategory(startDate, endDate);
  }

  @Get('spend-by-vendor')
  @ApiOperation({ summary: 'Get spend by vendor report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSpendByVendor(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSpendByVendor(startDate, endDate);
  }

  @Get('budget-vs-actual')
  @ApiOperation({ summary: 'Get budget vs actual report' })
  getBudgetVsActual() {
    return this.reportsService.getBudgetVsActual();
  }

  @Get('outstanding-advances')
  @ApiOperation({ summary: 'Get outstanding advances report' })
  getOutstandingAdvances() {
    return this.reportsService.getOutstandingAdvances();
  }

  @Get('tax-summary')
  @ApiOperation({ summary: 'Get tax summary report (FBR compliance)' })
  @ApiQuery({ name: 'year', required: false })
  getTaxSummary(@Query('year') year?: number) {
    return this.reportsService.getTaxSummary(year);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export a report to file' })
  async exportReport(@Body() exportDto: ExportReportDto, @Res() res: Response) {
    const file = await this.reportsService.exportReport(exportDto);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }
}
