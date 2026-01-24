import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { DisburseVoucherDto, SettleVoucherDto } from './dto/voucher-actions.dto';
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
  @ApiOperation({ summary: 'Get all vouchers' })
  @ApiQuery({ name: 'status', enum: VoucherStatus, required: false })
  findAll(@Req() req: AuthenticatedRequest, @Query('status') status?: VoucherStatus) {
    return this.vouchersService.findAll(req.user, status);
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
}
