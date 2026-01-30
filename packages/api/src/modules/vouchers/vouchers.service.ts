import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { DisburseVoucherDto, SettleVoucherDto } from './dto/voucher-actions.dto';
import { VoucherStatus, RoleType, User } from '@prisma/client';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createVoucherDto: CreateVoucherDto) {
    const voucherNumber = await this.generateVoucherNumber();

    // Default settlement deadline is 30 days
    const settlementDeadline = new Date();
    settlementDeadline.setDate(settlementDeadline.getDate() + 30);

    return this.prisma.voucher.create({
      data: {
        voucherNumber,
        requesterId: userId,
        requestedAmount: createVoucherDto.requestedAmount,
        purpose: createVoucherDto.purpose,
        settlementDeadline: createVoucherDto.settlementDeadline
          ? new Date(createVoucherDto.settlementDeadline)
          : settlementDeadline,
        status: VoucherStatus.REQUESTED,
      },
    });
  }

  async findAll(user: User, status?: VoucherStatus) {
    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    return this.prisma.voucher.findMany({
      where: {
        ...(isAdmin ? {} : { requesterId: user.id }),
        ...(status && { status }),
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        expenses: {
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: User) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        expenses: {
          include: {
            category: true,
            receipts: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    if (!isAdmin && voucher.requesterId !== user.id) {
      throw new ForbiddenException('You do not have access to this voucher');
    }

    return voucher;
  }

  async approve(id: string, user: User) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    if (voucher.status !== VoucherStatus.REQUESTED) {
      throw new BadRequestException('Only requested vouchers can be approved');
    }

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.APPROVED,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });
  }

  async disburse(id: string, user: User, dto: DisburseVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    if (voucher.status !== VoucherStatus.APPROVED) {
      throw new BadRequestException('Only approved vouchers can be disbursed');
    }

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.DISBURSED,
        disbursedBy: user.id,
        disbursedAt: new Date(),
        disbursedAmount: dto.amount,
      },
    });
  }

  async settle(id: string, user: User, _dto: SettleVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        expenses: true,
      },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    if (voucher.requesterId !== user.id) {
      throw new ForbiddenException('Only the requester can settle this voucher');
    }

    if (voucher.status !== VoucherStatus.DISBURSED) {
      throw new BadRequestException('Only disbursed vouchers can be settled');
    }

    const totalExpenses = voucher.expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);

    const returnAmount = Number(voucher.disbursedAmount) - totalExpenses;

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.SETTLED,
        settledAmount: totalExpenses,
        cashReturned: returnAmount > 0 ? returnAmount : 0,
        settledAt: new Date(),
      },
    });
  }

  private async generateVoucherNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastVoucher = await this.prisma.voucher.findFirst({
      where: {
        voucherNumber: {
          startsWith: `PCV-${year}`,
        },
      },
      orderBy: { voucherNumber: 'desc' },
    });

    let sequence = 1;
    if (lastVoucher) {
      const lastSequence = parseInt(lastVoucher.voucherNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `PCV-${year}-${sequence.toString().padStart(5, '0')}`;
  }
}
