import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ExpenseStatus, RoleType } from '@prisma/client';

describe('ReceiptsService', () => {
  let service: ReceiptsService;

  const mockPrismaService = {
    expense: {
      findUnique: jest.fn(),
    },
    receipt: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    getSignedUrl: jest.fn(),
    deleteFile: jest.fn(),
    generateReceiptKey: jest.fn(),
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
    status: ExpenseStatus.DRAFT,
  };

  const mockFile: Express.Multer.File = {
    buffer: Buffer.from('fake-file-content'),
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 1024 * 500, // 500KB
    fieldname: 'file',
    encoding: '7bit',
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockReceipt = {
    id: 'receipt-1',
    expenseId: 'expense-1',
    fileName: 'receipts/expense-1/123-receipt.jpg',
    originalName: 'receipt.jpg',
    fileSize: 512000,
    mimeType: 'image/jpeg',
    s3Bucket: 'expense-receipts',
    s3Key: 'receipts/expense-1/123-receipt.jpg',
    fileHash: 'abc123hash',
    ocrStatus: null,
    ocrResult: null,
    ocrConfidence: null,
    uploadedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── upload ───────────────────────────────────────────────────────────

  describe('upload', () => {
    it('should upload a receipt successfully for a draft expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(null);
      mockStorageService.generateReceiptKey.mockReturnValue('receipts/expense-1/123-receipt.jpg');
      mockStorageService.uploadFile.mockResolvedValue('receipts/expense-1/123-receipt.jpg');
      mockPrismaService.receipt.create.mockResolvedValue(mockReceipt);

      const result = await service.upload('expense-1', mockUser, mockFile);

      expect(result).toEqual(mockReceipt);
      expect(mockPrismaService.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
      });
      expect(mockStorageService.generateReceiptKey).toHaveBeenCalledWith(
        'expense-1',
        'receipt.jpg',
      );
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        'receipts/expense-1/123-receipt.jpg',
        'image/jpeg',
      );
      expect(mockPrismaService.receipt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expenseId: 'expense-1',
          originalName: 'receipt.jpg',
          fileSize: mockFile.size,
          mimeType: 'image/jpeg',
          s3Bucket: 'expense-receipts',
          s3Key: 'receipts/expense-1/123-receipt.jpg',
        }),
      });
    });

    it('should throw NotFoundException when expense does not exist', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.upload('nonexistent', mockUser, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the expense owner', async () => {
      const otherUserExpense = { ...mockExpense, submitterId: 'other-user' };
      mockPrismaService.expense.findUnique.mockResolvedValue(otherUserExpense);

      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when expense is not in DRAFT status', async () => {
      const submittedExpense = { ...mockExpense, status: ExpenseStatus.SUBMITTED };
      mockPrismaService.expense.findUnique.mockResolvedValue(submittedExpense);

      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject upload when expense is APPROVED', async () => {
      const approvedExpense = { ...mockExpense, status: ExpenseStatus.APPROVED };
      mockPrismaService.expense.findUnique.mockResolvedValue(approvedExpense);

      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        'Receipts can only be added to draft expenses',
      );
    });

    it('should reject upload when expense is PENDING_APPROVAL', async () => {
      const pendingExpense = { ...mockExpense, status: ExpenseStatus.PENDING_APPROVAL };
      mockPrismaService.expense.findUnique.mockResolvedValue(pendingExpense);

      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should detect duplicate files by SHA256 hash', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(mockReceipt);

      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        'This receipt has already been uploaded',
      );
    });

    it('should generate a SHA256 hash from file buffer', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(null);
      mockStorageService.generateReceiptKey.mockReturnValue('receipts/expense-1/123-receipt.jpg');
      mockStorageService.uploadFile.mockResolvedValue('key');
      mockPrismaService.receipt.create.mockResolvedValue(mockReceipt);

      await service.upload('expense-1', mockUser, mockFile);

      // Verify that findFirst was called with a valid SHA256 hex hash
      const callArgs = mockPrismaService.receipt.findFirst.mock.calls[0][0];
      expect(callArgs.where.fileHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should store the fileHash in the created receipt', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(null);
      mockStorageService.generateReceiptKey.mockReturnValue('receipts/expense-1/123-receipt.jpg');
      mockStorageService.uploadFile.mockResolvedValue('key');
      mockPrismaService.receipt.create.mockResolvedValue(mockReceipt);

      await service.upload('expense-1', mockUser, mockFile);

      const createArgs = mockPrismaService.receipt.create.mock.calls[0][0];
      expect(createArgs.data.fileHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should use correct S3 key format from StorageService', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(null);
      mockStorageService.generateReceiptKey.mockReturnValue(
        'receipts/expense-1/1700000000-receipt.jpg',
      );
      mockStorageService.uploadFile.mockResolvedValue('key');
      mockPrismaService.receipt.create.mockResolvedValue(mockReceipt);

      await service.upload('expense-1', mockUser, mockFile);

      expect(mockStorageService.generateReceiptKey).toHaveBeenCalledWith(
        'expense-1',
        'receipt.jpg',
      );
      expect(mockPrismaService.receipt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          s3Key: 'receipts/expense-1/1700000000-receipt.jpg',
          fileName: 'receipts/expense-1/1700000000-receipt.jpg',
        }),
      });
    });

    it('should throw BadRequestException when storage upload fails', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(null);
      mockStorageService.generateReceiptKey.mockReturnValue('receipts/expense-1/123-receipt.jpg');
      mockStorageService.uploadFile.mockRejectedValue(new Error('S3 connection error'));

      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upload('expense-1', mockUser, mockFile)).rejects.toThrow(
        'Failed to upload receipt file',
      );
    });

    it('should set s3Bucket to expense-receipts', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findFirst.mockResolvedValue(null);
      mockStorageService.generateReceiptKey.mockReturnValue('key');
      mockStorageService.uploadFile.mockResolvedValue('key');
      mockPrismaService.receipt.create.mockResolvedValue(mockReceipt);

      await service.upload('expense-1', mockUser, mockFile);

      const createArgs = mockPrismaService.receipt.create.mock.calls[0][0];
      expect(createArgs.data.s3Bucket).toBe('expense-receipts');
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────

  describe('findOne', () => {
    const receiptWithExpense = {
      ...mockReceipt,
      expense: mockExpense,
    };

    it('should return receipt when user is the expense owner', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      const result = await service.findOne('receipt-1', mockUser);

      expect(result).toEqual(receiptWithExpense);
      expect(mockPrismaService.receipt.findUnique).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
        include: { expense: true },
      });
    });

    it('should return receipt when user has APPROVER role', async () => {
      const approverUser = { ...mockUser, id: 'approver-1', role: RoleType.APPROVER };
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      const result = await service.findOne('receipt-1', approverUser);

      expect(result).toEqual(receiptWithExpense);
    });

    it('should return receipt when user has FINANCE role', async () => {
      const financeUser = { ...mockUser, id: 'finance-1', role: RoleType.FINANCE };
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      const result = await service.findOne('receipt-1', financeUser);

      expect(result).toEqual(receiptWithExpense);
    });

    it('should return receipt when user has ADMIN role', async () => {
      const adminUser = { ...mockUser, id: 'admin-1', role: RoleType.ADMIN };
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      const result = await service.findOne('receipt-1', adminUser);

      expect(result).toEqual(receiptWithExpense);
    });

    it('should throw NotFoundException when receipt does not exist', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-privileged user is not the owner', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      await expect(service.findOne('receipt-1', otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with descriptive message', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      await expect(service.findOne('receipt-1', otherUser)).rejects.toThrow(
        'You do not have access to this receipt',
      );
    });
  });

  // ─── getDownloadUrl ───────────────────────────────────────────────────

  describe('getDownloadUrl', () => {
    const receiptWithExpense = {
      ...mockReceipt,
      expense: mockExpense,
    };

    it('should return presigned URL with metadata', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);
      mockStorageService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const result = await service.getDownloadUrl('receipt-1', mockUser);

      expect(result).toEqual({
        url: 'https://s3.example.com/signed-url',
        expiresIn: 3600,
        filename: 'receipt.jpg',
        mimeType: 'image/jpeg',
      });
    });

    it('should request signed URL with 3600s expiry', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);
      mockStorageService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      await service.getDownloadUrl('receipt-1', mockUser);

      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
        receiptWithExpense.s3Key,
        3600,
      );
    });

    it('should throw BadRequestException when signed URL generation fails', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);
      mockStorageService.getSignedUrl.mockRejectedValue(new Error('S3 error'));

      await expect(service.getDownloadUrl('receipt-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getDownloadUrl('receipt-1', mockUser)).rejects.toThrow(
        'Failed to generate download URL',
      );
    });

    it('should throw NotFoundException when receipt does not exist', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(null);

      await expect(service.getDownloadUrl('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────

  describe('remove', () => {
    const receiptWithExpense = {
      ...mockReceipt,
      expense: mockExpense,
    };

    it('should delete receipt and its S3 object for draft expenses', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.receipt.delete.mockResolvedValue(receiptWithExpense);

      const result = await service.remove('receipt-1', mockUser);

      expect(result).toEqual(receiptWithExpense);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(receiptWithExpense.s3Key);
      expect(mockPrismaService.receipt.delete).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
      });
    });

    it('should throw NotFoundException when receipt does not exist', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the expense owner', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);

      await expect(service.remove('receipt-1', otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when expense is not in DRAFT status', async () => {
      const submittedReceipt = {
        ...receiptWithExpense,
        expense: { ...mockExpense, status: ExpenseStatus.SUBMITTED },
      };
      mockPrismaService.receipt.findUnique.mockResolvedValue(submittedReceipt);

      await expect(service.remove('receipt-1', mockUser)).rejects.toThrow(BadRequestException);
      await expect(service.remove('receipt-1', mockUser)).rejects.toThrow(
        'Receipts can only be deleted from draft expenses',
      );
    });

    it('should still delete from database even if S3 deletion fails', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);
      mockStorageService.deleteFile.mockRejectedValue(new Error('S3 unreachable'));
      mockPrismaService.receipt.delete.mockResolvedValue(receiptWithExpense);

      const result = await service.remove('receipt-1', mockUser);

      expect(result).toEqual(receiptWithExpense);
      expect(mockPrismaService.receipt.delete).toHaveBeenCalled();
    });

    it('should call StorageService.deleteFile with correct key', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(receiptWithExpense);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.receipt.delete.mockResolvedValue(receiptWithExpense);

      await service.remove('receipt-1', mockUser);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'receipts/expense-1/123-receipt.jpg',
      );
    });
  });

  // ─── findOneInternal ──────────────────────────────────────────────────

  describe('findOneInternal', () => {
    it('should return receipt without access control check', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);

      const result = await service.findOneInternal('receipt-1');

      expect(result).toEqual(mockReceipt);
      expect(mockPrismaService.receipt.findUnique).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
      });
    });

    it('should throw NotFoundException when receipt does not exist', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(null);

      await expect(service.findOneInternal('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should not include expense relation', async () => {
      mockPrismaService.receipt.findUnique.mockResolvedValue(mockReceipt);

      await service.findOneInternal('receipt-1');

      expect(mockPrismaService.receipt.findUnique).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
      });
      // Verify no include option was passed
      const callArgs = mockPrismaService.receipt.findUnique.mock.calls[0][0];
      expect(callArgs.include).toBeUndefined();
    });
  });

  // ─── findByExpense ────────────────────────────────────────────────────

  describe('findByExpense', () => {
    it('should return all receipts for expense when user is owner', async () => {
      const receipts = [mockReceipt, { ...mockReceipt, id: 'receipt-2' }];
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findMany.mockResolvedValue(receipts);

      const result = await service.findByExpense('expense-1', mockUser);

      expect(result).toEqual(receipts);
      expect(mockPrismaService.receipt.findMany).toHaveBeenCalledWith({
        where: { expenseId: 'expense-1' },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('should return receipts when user has APPROVER role', async () => {
      const approverUser = { ...mockUser, id: 'approver-1', role: RoleType.APPROVER };
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findMany.mockResolvedValue([mockReceipt]);

      const result = await service.findByExpense('expense-1', approverUser);

      expect(result).toEqual([mockReceipt]);
    });

    it('should return receipts when user has FINANCE role', async () => {
      const financeUser = { ...mockUser, id: 'finance-1', role: RoleType.FINANCE };
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findMany.mockResolvedValue([]);

      const result = await service.findByExpense('expense-1', financeUser);

      expect(result).toEqual([]);
    });

    it('should return receipts when user has ADMIN role', async () => {
      const adminUser = { ...mockUser, id: 'admin-1', role: RoleType.ADMIN };
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findMany.mockResolvedValue([]);

      await service.findByExpense('expense-1', adminUser);

      expect(mockPrismaService.receipt.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when expense does not exist', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.findByExpense('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-privileged user is not the owner', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      await expect(service.findByExpense('expense-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException with descriptive message for unauthorized access', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      await expect(service.findByExpense('expense-1', otherUser)).rejects.toThrow(
        'You do not have access to these receipts',
      );
    });

    it('should order receipts by uploadedAt descending', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.receipt.findMany.mockResolvedValue([]);

      await service.findByExpense('expense-1', mockUser);

      expect(mockPrismaService.receipt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { uploadedAt: 'desc' },
        }),
      );
    });
  });
});
