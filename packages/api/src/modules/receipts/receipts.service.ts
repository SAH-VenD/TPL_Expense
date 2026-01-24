import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExpenseStatus, User } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService) {}

  async upload(expenseId: string, user: User, file: Express.Multer.File) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only upload receipts to your own expenses');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Receipts can only be added to draft expenses');
    }

    // Generate file hash for duplicate detection
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');

    // Check for duplicates
    const existingReceipt = await this.prisma.receipt.findFirst({
      where: { fileHash },
    });

    if (existingReceipt) {
      throw new BadRequestException('This receipt has already been uploaded');
    }

    // TODO: Upload to S3 and get URL
    const s3Bucket = 'expense-receipts';
    const s3Key = `receipts/${expense.id}/${Date.now()}-${file.originalname}`;

    return this.prisma.receipt.create({
      data: {
        expenseId,
        fileName: s3Key,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        s3Bucket,
        s3Key,
        fileHash,
      },
    });
  }

  async findOne(id: string, user: User) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        expense: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    if (receipt.expense.submitterId !== user.id) {
      throw new ForbiddenException('You do not have access to this receipt');
    }

    return receipt;
  }

  async getDownloadUrl(id: string, user: User) {
    const receipt = await this.findOne(id, user);

    // TODO: Generate presigned S3 URL
    const presignedUrl = `https://s3.amazonaws.com/${receipt.s3Bucket}/${receipt.s3Key}?token=presigned`;

    return {
      url: presignedUrl,
      expiresIn: 3600, // 1 hour
    };
  }

  async remove(id: string, user: User) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        expense: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    if (receipt.expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only delete your own receipts');
    }

    if (receipt.expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Receipts can only be deleted from draft expenses');
    }

    // TODO: Delete from S3

    return this.prisma.receipt.delete({
      where: { id },
    });
  }
}
