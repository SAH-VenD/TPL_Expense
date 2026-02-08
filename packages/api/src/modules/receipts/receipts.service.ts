import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ExpenseStatus, User } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Upload a receipt for an expense
   */
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

    // Generate storage key and upload file
    const s3Key = this.storageService.generateReceiptKey(expenseId, file.originalname);
    const s3Bucket = 'expense-receipts';

    try {
      await this.storageService.uploadFile(file.buffer, s3Key, file.mimetype);
      this.logger.log(`Receipt uploaded: ${s3Key}`);
    } catch (error) {
      this.logger.error(`Failed to upload receipt: ${error}`);
      throw new BadRequestException('Failed to upload receipt file');
    }

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

  /**
   * Get a receipt by ID (with authorization check)
   */
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

    // Allow access if user owns the expense or is an approver/finance/admin
    const isOwner = receipt.expense.submitterId === user.id;
    const isPrivileged = ['APPROVER', 'FINANCE', 'ADMIN'].includes(user.role);

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have access to this receipt');
    }

    return receipt;
  }

  /**
   * Get a presigned URL for downloading a receipt
   */
  async getDownloadUrl(id: string, user: User) {
    const receipt = await this.findOne(id, user);

    try {
      const url = await this.storageService.getSignedUrl(receipt.s3Key, 3600);
      return {
        url,
        expiresIn: 3600,
        filename: receipt.originalName,
        mimeType: receipt.mimeType,
      };
    } catch (error) {
      this.logger.error(`Failed to generate download URL: ${error}`);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * Delete a receipt
   */
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

    // Delete from storage
    try {
      await this.storageService.deleteFile(receipt.s3Key);
      this.logger.log(`Receipt deleted from storage: ${receipt.s3Key}`);
    } catch (error) {
      this.logger.error(`Failed to delete receipt from storage: ${error}`);
      // Continue with database deletion even if storage deletion fails
    }

    return this.prisma.receipt.delete({
      where: { id },
    });
  }

  /**
   * Get a receipt by ID (internal use, no auth check)
   */
  async findOneInternal(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    return receipt;
  }

  /**
   * Get all receipts for an expense
   */
  async findByExpense(expenseId: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    // Allow access if user owns the expense or is an approver/finance/admin
    const isOwner = expense.submitterId === user.id;
    const isPrivileged = ['APPROVER', 'FINANCE', 'ADMIN'].includes(user.role);

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have access to these receipts');
    }

    return this.prisma.receipt.findMany({
      where: { expenseId },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
