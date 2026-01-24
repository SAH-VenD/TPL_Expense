import { Injectable } from '@nestjs/common';
import { S3Provider } from './providers/s3.provider';

@Injectable()
export class StorageService {
  constructor(private s3Provider: S3Provider) {}

  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<string> {
    return this.s3Provider.upload(buffer, key, mimeType);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.s3Provider.getSignedUrl(key, expiresIn);
  }

  async deleteFile(key: string): Promise<void> {
    return this.s3Provider.delete(key);
  }

  async fileExists(key: string): Promise<boolean> {
    return this.s3Provider.exists(key);
  }
}
