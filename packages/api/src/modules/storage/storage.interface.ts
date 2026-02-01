/**
 * Storage provider interface
 * Implemented by S3Provider and LocalStorageProvider
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage
   * @param buffer - File content
   * @param key - Storage key/path
   * @param mimeType - File MIME type
   * @returns Storage key
   */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>;

  /**
   * Get a signed/accessible URL for a file
   * @param key - Storage key
   * @param expiresIn - URL expiration in seconds
   * @returns Accessible URL
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a file from storage
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   * @param key - Storage key
   * @returns Boolean indicating existence
   */
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
