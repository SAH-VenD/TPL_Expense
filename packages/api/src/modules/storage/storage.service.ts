import { Injectable, Inject } from '@nestjs/common';
import { IStorageProvider, STORAGE_PROVIDER } from './storage.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: IStorageProvider,
  ) {}

  /**
   * Upload a file to storage
   * @param buffer - File content
   * @param key - Storage key/path
   * @param mimeType - File MIME type
   * @returns Storage key
   */
  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    return this.provider.upload(buffer, key, mimeType);
  }

  /**
   * Get a signed/accessible URL for a file
   * @param key - Storage key
   * @param expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns Accessible URL
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.provider.getSignedUrl(key, expiresIn);
  }

  /**
   * Delete a file from storage
   * @param key - Storage key
   */
  async deleteFile(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  /**
   * Check if a file exists in storage
   * @param key - Storage key
   * @returns Boolean indicating existence
   */
  async fileExists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  /**
   * Generate a unique storage key for receipts
   * @param expenseId - Expense ID
   * @param filename - Original filename
   * @returns Storage key
   */
  generateReceiptKey(expenseId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replaceAll(/[^a-zA-Z0-9.-]/g, '_');
    return `receipts/${expenseId}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Generate a unique storage key for attachments
   * @param entityType - Entity type (expense, voucher, etc.)
   * @param entityId - Entity ID
   * @param filename - Original filename
   * @returns Storage key
   */
  generateAttachmentKey(entityType: string, entityId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replaceAll(/[^a-zA-Z0-9.-]/g, '_');
    return `attachments/${entityType}/${entityId}/${timestamp}-${sanitizedFilename}`;
  }
}
