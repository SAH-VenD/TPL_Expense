import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { OcrService } from './ocr.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TextractProvider, OcrResult } from './providers/textract.provider';

describe('OcrService', () => {
  let service: OcrService;

  const mockPrismaService = {
    receipt: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    expense: {
      update: jest.fn(),
    },
    vendor: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTextractProvider = {
    analyzeExpense: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'employee@tekcellent.com',
    firstName: 'Jane',
    lastName: 'Employee',
    role: RoleType.EMPLOYEE,
  } as any;

  const mockExpense = {
    id: 'expense-1',
    submitterId: 'user-1',
  };

  const mockReceipt = {
    id: 'receipt-1',
    expenseId: 'expense-1',
    s3Key: 'receipts/expense-1/123-receipt.jpg',
    originalName: 'receipt.jpg',
    mimeType: 'image/jpeg',
    ocrStatus: null,
    ocrResult: null,
    ocrConfidence: null,
    expense: mockExpense,
  };

  const highConfidenceResult: OcrResult = {
    vendorName: 'Tekcellent Solutions',
    vendorAddress: '123 Business Ave, Karachi',
    date: '2026-01-15',
    amount: 5000,
    taxAmount: 850,
    total: 5850,
    currency: 'PKR',
    invoiceNumber: 'INV-2026-001',
    confidence: 92,
    lineItems: [{ description: 'Consulting services', quantity: 1, unitPrice: 5000, amount: 5000 }],
  };

  const lowConfidenceResult: OcrResult = {
    vendorName: 'Blurry Store',
    amount: 200,
    confidence: 55,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TextractProvider, useValue: mockTextractProvider },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── processReceipt ───────────────────────────────────────────────────

  describe('processReceipt', () => {
    it('should process receipt and auto-update expense when confidence >= 80', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.create.mockResolvedValue({
        id: 'vendor-1',
        name: 'Tekcellent Solutions',
      });
      mockPrismaService.expense.update.mockResolvedValue({});

      const result = await service.processReceipt('receipt-1', mockUser);

      expect(result).toEqual(highConfidenceResult);
      expect(mockTextractProvider.analyzeExpense).toHaveBeenCalledWith(mockReceipt.s3Key);
    });

    it('should update receipt with OCR data on success', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.create.mockResolvedValue({ id: 'vendor-1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      expect(mockPrismaService.receipt.update).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
        data: {
          ocrResult: highConfidenceResult,
          ocrStatus: 'completed',
          ocrConfidence: 92,
        },
      });
    });

    it('should update expense with extracted data when confidence >= 80', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: 'existing-vendor',
        name: 'Tekcellent Solutions',
      });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      expect(mockPrismaService.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        data: expect.objectContaining({
          ocrProcessed: true,
          ocrConfidence: 92,
          amount: 5000,
          taxAmount: 850,
          totalAmount: 5850,
          invoiceNumber: 'INV-2026-001',
          vendorId: 'existing-vendor',
        }),
      });
    });

    it('should set expenseDate from OCR date field', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      const updateArgs = mockPrismaService.expense.update.mock.calls[0][0];
      expect(updateArgs.data.expenseDate).toEqual(new Date('2026-01-15'));
    });

    it('should flag for manual review when confidence < 80', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(lowConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.expense.update.mockResolvedValue({});

      const result = await service.processReceipt('receipt-1', mockUser);

      expect(result).toEqual(lowConfidenceResult);
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        data: {
          ocrNeedsReview: true,
          ocrConfidence: 55,
        },
      });
    });

    it('should NOT auto-update expense fields when confidence < 80', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(lowConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      // The expense.update for low confidence should only set review flags, not data fields
      const updateArgs = mockPrismaService.expense.update.mock.calls[0][0];
      expect(updateArgs.data.amount).toBeUndefined();
      expect(updateArgs.data.ocrProcessed).toBeUndefined();
    });

    it('should throw error when receipt is not found', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(null);

      await expect(service.processReceipt('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate Textract service errors', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockRejectedValue(new Error('Textract unavailable'));

      await expect(service.processReceipt('receipt-1', mockUser)).rejects.toThrow(
        'Textract unavailable',
      );
    });

    it('should auto-create vendor when vendor name extracted and no match found', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.create.mockResolvedValue({
        id: 'new-vendor',
        name: 'Tekcellent Solutions',
      });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      expect(mockPrismaService.vendor.create).toHaveBeenCalledWith({
        data: {
          name: 'Tekcellent Solutions',
          normalizedName: 'tekcellent solutions',
          address: '123 Business Ave, Karachi',
        },
      });
    });

    it('should use existing vendor when match found (case-insensitive)', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: 'existing-vendor',
        name: 'Tekcellent Solutions',
      });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      expect(mockPrismaService.vendor.create).not.toHaveBeenCalled();
      expect(mockPrismaService.vendor.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'Tekcellent Solutions', mode: 'insensitive' } },
      });
    });

    it('should create vendor without address when vendorAddress is not provided', async () => {
      const resultNoAddress: OcrResult = {
        ...highConfidenceResult,
        vendorAddress: undefined,
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(resultNoAddress);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.create.mockResolvedValue({ id: 'new-vendor' });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      const createArgs = mockPrismaService.vendor.create.mock.calls[0][0];
      expect(createArgs.data.address).toBeUndefined();
    });

    it('should handle OCR result with only amount and confidence', async () => {
      const minimalResult: OcrResult = {
        amount: 1500,
        confidence: 85,
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(minimalResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      const updateArgs = mockPrismaService.expense.update.mock.calls[0][0];
      expect(updateArgs.data.amount).toBe(1500);
      expect(updateArgs.data.ocrProcessed).toBe(true);
      expect(updateArgs.data.expenseDate).toBeUndefined();
      expect(updateArgs.data.vendorId).toBeUndefined();
      expect(updateArgs.data.invoiceNumber).toBeUndefined();
    });

    it('should handle confidence exactly at 80 threshold', async () => {
      const borderlineResult: OcrResult = {
        amount: 3000,
        confidence: 80,
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(borderlineResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      // Confidence === 80 should trigger auto-update (>= 80)
      const updateArgs = mockPrismaService.expense.update.mock.calls[0][0];
      expect(updateArgs.data.ocrProcessed).toBe(true);
      expect(updateArgs.data.amount).toBe(3000);
    });

    it('should handle confidence at 79 as low confidence', async () => {
      const justBelowResult: OcrResult = {
        amount: 3000,
        confidence: 79,
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(justBelowResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      const updateArgs = mockPrismaService.expense.update.mock.calls[0][0];
      expect(updateArgs.data.ocrNeedsReview).toBe(true);
      expect(updateArgs.data.ocrProcessed).toBeUndefined();
    });

    it('should set totalAmount from OCR total field', async () => {
      const resultWithTotal: OcrResult = {
        total: 7500,
        confidence: 90,
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(resultWithTotal);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      const updateArgs = mockPrismaService.expense.update.mock.calls[0][0];
      expect(updateArgs.data.totalAmount).toBe(7500);
    });

    it('should throw ForbiddenException when non-owner, non-privileged user tries to process', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);

      await expect(service.processReceipt('receipt-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException with descriptive message for unauthorized access', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);

      await expect(service.processReceipt('receipt-1', otherUser)).rejects.toThrow(
        'You do not have permission to access this receipt',
      );
    });

    it('should allow ADMIN to process any receipt', async () => {
      const adminUser = { ...mockUser, id: 'admin-1', role: RoleType.ADMIN };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      const result = await service.processReceipt('receipt-1', adminUser);

      expect(result).toEqual(highConfidenceResult);
    });

    it('should allow FINANCE to process any receipt', async () => {
      const financeUser = { ...mockUser, id: 'finance-1', role: RoleType.FINANCE };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      const result = await service.processReceipt('receipt-1', financeUser);

      expect(result).toEqual(highConfidenceResult);
    });

    it('should deny APPROVER from processing another users receipt', async () => {
      const approverUser = { ...mockUser, id: 'approver-1', role: RoleType.APPROVER };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);

      await expect(service.processReceipt('receipt-1', approverUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include expense relation when looking up receipt', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.processReceipt('receipt-1', mockUser);

      expect(mockPrismaService.receipt.findUnique).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
        include: { expense: true },
      });
    });
  });

  // ─── reprocessReceipt ─────────────────────────────────────────────────

  describe('reprocessReceipt', () => {
    it('should reprocess receipt by calling processReceipt', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(highConfidenceResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      const result = await service.reprocessReceipt('receipt-1', mockUser);

      expect(result).toEqual(highConfidenceResult);
      expect(mockTextractProvider.analyzeExpense).toHaveBeenCalledWith(mockReceipt.s3Key);
    });

    it('should throw error when receipt not found during reprocess', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(null);

      await expect(service.reprocessReceipt('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update receipt OCR data with new results', async () => {
      const updatedResult: OcrResult = {
        ...highConfidenceResult,
        confidence: 95,
        amount: 6000,
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockResolvedValue(updatedResult);
      mockPrismaService.receipt.update.mockResolvedValue({});
      mockPrismaService.vendor.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrismaService.expense.update.mockResolvedValue({});

      await service.reprocessReceipt('receipt-1', mockUser);

      expect(mockPrismaService.receipt.update).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
        data: {
          ocrResult: updatedResult,
          ocrStatus: 'completed',
          ocrConfidence: 95,
        },
      });
    });

    it('should propagate errors from Textract during reprocess', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);
      mockTextractProvider.analyzeExpense.mockRejectedValue(new Error('Service timeout'));

      await expect(service.reprocessReceipt('receipt-1', mockUser)).rejects.toThrow(
        'Service timeout',
      );
    });
  });
});
