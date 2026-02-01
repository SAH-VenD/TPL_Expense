import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateApprovalTierDto } from './dto/approval-tier.dto';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Approval Tiers
  @Get('approval-tiers')
  @ApiOperation({ summary: 'Get all approval tiers' })
  getApprovalTiers() {
    return this.adminService.getApprovalTiers();
  }

  @Post('approval-tiers')
  @ApiOperation({ summary: 'Create an approval tier' })
  createApprovalTier(@Body() dto: CreateApprovalTierDto) {
    return this.adminService.createApprovalTier(dto);
  }

  @Patch('approval-tiers/:id')
  @ApiOperation({ summary: 'Update an approval tier' })
  updateApprovalTier(@Param('id') id: string, @Body() dto: CreateApprovalTierDto) {
    return this.adminService.updateApprovalTier(id, dto);
  }

  // System Settings
  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update system settings' })
  updateSettings(@Body() dto: SystemSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  // Dashboard Stats
  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Test Data
  @Post('generate-test-data')
  @ApiOperation({ summary: 'Generate test data for development' })
  generateTestData() {
    return this.adminService.generateTestData();
  }
}
