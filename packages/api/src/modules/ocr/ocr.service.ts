import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { User, RoleType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TextractProvider, OcrResult } from './providers/textract.provider';

/** Roles that can access any receipt for auditing purposes */
const RECEIPT_AUDIT_ROLES: RoleType[] = [RoleType.ADMIN, RoleType.FINANCE];

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private prisma: PrismaService,
    private textractProvider: TextractProvider,
  ) {}

  async processReceipt(receiptId: string, user: User): Promise<OcrResult> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { expense: true },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${receiptId} not found`);
    }

    const isOwner = receipt.expense.submitterId === user.id;
    const canAudit = RECEIPT_AUDIT_ROLES.includes(user.role);

    if (!isOwner && !canAudit) {
      throw new ForbiddenException('You do not have permission to access this receipt');
    }

    this.logger.log(`Processing receipt: ${receiptId}`);

    const result = await this.textractProvider.analyzeExpense(receipt.s3Key);

    // Update receipt with OCR data
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        ocrResult: result as any,
        ocrStatus: 'completed',
        ocrConfidence: result.confidence,
      },
    });

    // Update expense with extracted data if confidence is high enough
    if (result.confidence >= 80) {
      await this.updateExpenseFromOcr(receipt.expenseId, result);
    } else {
      // Flag for manual review
      await this.prisma.expense.update({
        where: { id: receipt.expenseId },
        data: {
          ocrNeedsReview: true,
          ocrConfidence: result.confidence,
        },
      });
    }

    return result;
  }

  private async updateExpenseFromOcr(expenseId: string, ocrResult: OcrResult) {
    const updateData: any = {
      ocrProcessed: true,
      ocrConfidence: ocrResult.confidence,
    };

    if (ocrResult.amount) {
      updateData.amount = ocrResult.amount;
    }

    if (ocrResult.date) {
      updateData.expenseDate = new Date(ocrResult.date);
    }

    if (ocrResult.taxAmount) {
      updateData.taxAmount = ocrResult.taxAmount;
    }

    if (ocrResult.total) {
      updateData.totalAmount = ocrResult.total;
    }

    if (ocrResult.invoiceNumber) {
      updateData.invoiceNumber = ocrResult.invoiceNumber;
    }

    // Handle vendor
    if (ocrResult.vendorName) {
      let vendor = await this.prisma.vendor.findFirst({
        where: { name: { equals: ocrResult.vendorName, mode: 'insensitive' } },
      });

      if (!vendor) {
        vendor = await this.prisma.vendor.create({
          data: {
            name: ocrResult.vendorName,
            normalizedName: ocrResult.vendorName.toLowerCase().trim(),
            ...(ocrResult.vendorAddress && { address: ocrResult.vendorAddress }),
          },
        });
      }

      updateData.vendorId = vendor.id;
    }

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
    });

    this.logger.log(`Updated expense ${expenseId} from OCR data`);
  }

  async reprocessReceipt(receiptId: string, user: User): Promise<OcrResult> {
    return this.processReceipt(receiptId, user);
  }
}
