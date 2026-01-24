import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PreApprovalsService } from './pre-approvals.service';
import { CreatePreApprovalDto } from './dto/create-pre-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType, PreApprovalStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../../common/types/request';

@ApiTags('Pre-Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pre-approvals')
export class PreApprovalsController {
  constructor(private readonly preApprovalsService: PreApprovalsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a pre-approval' })
  create(@Req() req: AuthenticatedRequest, @Body() createPreApprovalDto: CreatePreApprovalDto) {
    return this.preApprovalsService.create(req.user.id, createPreApprovalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pre-approvals' })
  @ApiQuery({ name: 'status', enum: PreApprovalStatus, required: false })
  findAll(@Req() req: AuthenticatedRequest, @Query('status') status?: PreApprovalStatus) {
    return this.preApprovalsService.findAll(req.user, status);
  }

  @Get('pending')
  @Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get pending pre-approvals for approval' })
  getPending(@Req() req: AuthenticatedRequest) {
    return this.preApprovalsService.getPending(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pre-approval by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.preApprovalsService.findOne(id, req.user);
  }

  @Post(':id/approve')
  @Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Approve a pre-approval request' })
  approve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('comments') comments?: string,
  ) {
    return this.preApprovalsService.approve(id, req.user, comments);
  }

  @Post(':id/reject')
  @Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Reject a pre-approval request' })
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.preApprovalsService.reject(id, req.user, reason);
  }
}
