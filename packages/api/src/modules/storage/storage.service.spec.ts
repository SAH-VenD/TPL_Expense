import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { STORAGE_PROVIDER } from './storage.interface';

describe('StorageService', () => {
  let service: StorageService;

  const mockStorageProvider = {
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);

    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should delegate upload to storage provider', async () => {
      const buffer = Buffer.from('file-content');
      const key = 'receipts/exp-1/file.pdf';
      const mimeType = 'application/pdf';
      mockStorageProvider.upload.mockResolvedValue(key);

      const result = await service.uploadFile(buffer, key, mimeType);

      expect(result).toBe(key);
      expect(mockStorageProvider.upload).toHaveBeenCalledWith(buffer, key, mimeType);
    });
  });

  describe('getSignedUrl', () => {
    it('should delegate to provider with default expiration', async () => {
      const expectedUrl = 'https://storage.example.com/signed-url';
      mockStorageProvider.getSignedUrl.mockResolvedValue(expectedUrl);

      const result = await service.getSignedUrl('receipts/exp-1/file.pdf');

      expect(result).toBe(expectedUrl);
      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith(
        'receipts/exp-1/file.pdf',
        3600,
      );
    });

    it('should delegate to provider with custom expiration', async () => {
      mockStorageProvider.getSignedUrl.mockResolvedValue('https://url');

      await service.getSignedUrl('key', 7200);

      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith('key', 7200);
    });
  });

  describe('deleteFile', () => {
    it('should delegate delete to storage provider', async () => {
      mockStorageProvider.delete.mockResolvedValue(undefined);

      await service.deleteFile('receipts/exp-1/file.pdf');

      expect(mockStorageProvider.delete).toHaveBeenCalledWith('receipts/exp-1/file.pdf');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockStorageProvider.exists.mockResolvedValue(true);

      const result = await service.fileExists('receipts/exp-1/file.pdf');

      expect(result).toBe(true);
      expect(mockStorageProvider.exists).toHaveBeenCalledWith('receipts/exp-1/file.pdf');
    });

    it('should return false when file does not exist', async () => {
      mockStorageProvider.exists.mockResolvedValue(false);

      const result = await service.fileExists('nonexistent/key');

      expect(result).toBe(false);
    });
  });

  describe('generateReceiptKey', () => {
    it('should generate key in correct format with timestamp', () => {
      const key = service.generateReceiptKey('expense-123', 'receipt.pdf');

      expect(key).toMatch(/^receipts\/expense-123\/\d+-receipt\.pdf$/);
    });

    it('should sanitize special characters in filename', () => {
      const key = service.generateReceiptKey('exp-1', 'my receipt (1).pdf');

      expect(key).toMatch(/^receipts\/exp-1\/\d+-my_receipt__1_\.pdf$/);
    });

    it('should preserve dots and hyphens in filename', () => {
      const key = service.generateReceiptKey('exp-1', 'receipt-2026.01.15.pdf');

      expect(key).toMatch(/^receipts\/exp-1\/\d+-receipt-2026\.01\.15\.pdf$/);
    });
  });

  describe('generateAttachmentKey', () => {
    it('should generate key with entity type and id', () => {
      const key = service.generateAttachmentKey('expense', 'exp-123', 'doc.pdf');

      expect(key).toMatch(/^attachments\/expense\/exp-123\/\d+-doc\.pdf$/);
    });

    it('should sanitize special characters in filename', () => {
      const key = service.generateAttachmentKey('voucher', 'v-1', 'file name (copy).xlsx');

      expect(key).toMatch(/^attachments\/voucher\/v-1\/\d+-file_name__copy_\.xlsx$/);
    });

    it('should support different entity types', () => {
      const expenseKey = service.generateAttachmentKey('expense', 'e-1', 'file.pdf');
      const voucherKey = service.generateAttachmentKey('voucher', 'v-1', 'file.pdf');

      expect(expenseKey).toContain('attachments/expense/');
      expect(voucherKey).toContain('attachments/voucher/');
    });
  });
});
