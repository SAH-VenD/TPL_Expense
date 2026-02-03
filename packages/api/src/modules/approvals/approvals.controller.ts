import { Controller, Get, Post, Body, UseGuards, Query, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { ApproveDto, RejectDto, ClarifyDto, BulkApproveDto } from './dto/approval.dto';
import { CreateDelegationDto, RevokeDelegationDto } from './dto/delegation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '@prisma/client';
import { AuthenticatedRequest } from '../../common/types/request';

@ApiTags('Approvals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // ==================== PENDING & HISTORY ====================

  @Get('pending')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getPending(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.approvalsService.getPendingApprovals(req.user, { page, limit });
  }

  @Get('history')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Get approval history for current user' })
  getHistory(@Req() req: AuthenticatedRequest) {
    return this.approvalsService.getApprovalHistory(req.user);
  }

  @Get('expenses/:expenseId/history')
  @Roles(
    RoleType.APPROVER,
    RoleType.SUPER_APPROVER,
    RoleType.FINANCE,
    RoleType.CEO,
    RoleType.EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get approval timeline for a specific expense' })
  getExpenseApprovalHistory(@Param('expenseId') expenseId: string) {
    return this.approvalsService.getExpenseApprovalHistory(expenseId);
  }

  // ==================== APPROVAL ACTIONS ====================

  @Post('approve')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Approve an expense' })
  approve(@Req() req: AuthenticatedRequest, @Body() approveDto: ApproveDto) {
    return this.approvalsService.approve(req.user, approveDto);
  }

  @Post('approve/bulk')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Bulk approve expenses' })
  bulkApprove(@Req() req: AuthenticatedRequest, @Body() bulkApproveDto: BulkApproveDto) {
    return this.approvalsService.bulkApprove(req.user, bulkApproveDto);
  }

  @Post('reject')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Reject an expense' })
  reject(@Req() req: AuthenticatedRequest, @Body() rejectDto: RejectDto) {
    return this.approvalsService.reject(req.user, rejectDto);
  }

  @Post('clarify')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Request clarification on an expense' })
  requestClarification(@Req() req: AuthenticatedRequest, @Body() clarifyDto: ClarifyDto) {
    return this.approvalsService.requestClarification(req.user, clarifyDto);
  }

  // ==================== DELEGATIONS ====================

  @Get('delegations')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Get active delegations for current user' })
  getDelegations(@Req() req: AuthenticatedRequest) {
    return this.approvalsService.getDelegations(req.user.id);
  }

  @Post('delegations')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Create an approval delegation' })
  createDelegation(
    @Req() req: AuthenticatedRequest,
    @Body() createDelegationDto: CreateDelegationDto,
  ) {
    return this.approvalsService.createDelegation(req.user.id, createDelegationDto);
  }

  @Post('delegations/revoke')
  @Roles(RoleType.APPROVER, RoleType.SUPER_APPROVER, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Revoke an approval delegation' })
  revokeDelegation(
    @Req() req: AuthenticatedRequest,
    @Body() revokeDelegationDto: RevokeDelegationDto,
  ) {
    return this.approvalsService.revokeDelegation(req.user.id, revokeDelegationDto);
  }

  // ==================== APPROVAL TIERS ====================

  @Get('tiers')
  @Roles(RoleType.ADMIN, RoleType.FINANCE, RoleType.CEO)
  @ApiOperation({ summary: 'Get all approval tiers' })
  getApprovalTiers() {
    return this.approvalsService.getApprovalTiers();
  }
}
