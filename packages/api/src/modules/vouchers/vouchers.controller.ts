import { Controller, Get, Post, Body, Param, UseGuards, Query, Req, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import {
  DisburseVoucherDto,
  SettleVoucherDto,
  RejectVoucherDto,
  LinkExpenseDto,
} from './dto/voucher-actions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType, VoucherStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../../common/types/request';

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new petty cash voucher request' })
  create(@Req() req: AuthenticatedRequest, @Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(req.user.id, createVoucherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vouchers (filtered by user unless admin/finance)' })
  @ApiQuery({ name: 'status', enum: VoucherStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: VoucherStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.vouchersService.findAll(
      req.user,
      status,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
    );
  }

  @Get('pending-approval')
  @Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get all vouchers pending approval' })
  getPendingApproval(@Req() req: AuthenticatedRequest) {
    return this.vouchersService.getPendingApproval(req.user);
  }

  @Get('outstanding')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get all outstanding vouchers (disbursed or partially settled)' })
  getOutstanding(@Req() req: AuthenticatedRequest) {
    return this.vouchersService.getOutstanding(req.user);
  }

  @Get('overdue')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get all overdue vouchers past settlement deadline' })
  getOverdue(@Req() req: AuthenticatedRequest) {
    return this.vouchersService.getOverdue(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.vouchersService.findOne(id, req.user);
  }

  @Post(':id/approve')
  @Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Approve a voucher request' })
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.vouchersService.approve(id, req.user);
  }

  @Post(':id/reject')
  @Roles(RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Reject a voucher request with reason' })
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() rejectDto: RejectVoucherDto,
  ) {
    return this.vouchersService.reject(id, req.user, rejectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a voucher (before disbursement only)' })
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.vouchersService.cancel(id, req.user);
  }

  @Post(':id/disburse')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Disburse funds for an approved voucher' })
  disburse(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() disburseDto: DisburseVoucherDto,
  ) {
    return this.vouchersService.disburse(id, req.user, disburseDto);
  }

  @Post(':id/settle')
  @ApiOperation({ summary: 'Settle a voucher with actual expenses' })
  settle(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() settleDto: SettleVoucherDto,
  ) {
    return this.vouchersService.settle(id, req.user, settleDto);
  }

  @Post(':id/link-expense')
  @ApiOperation({ summary: 'Link an expense to this voucher' })
  linkExpense(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() linkExpenseDto: LinkExpenseDto,
  ) {
    return this.vouchersService.linkExpense(id, req.user, linkExpenseDto);
  }
}
