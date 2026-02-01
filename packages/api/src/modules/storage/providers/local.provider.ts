import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Local file storage provider - placeholder for development/testing
 * In production, use S3Provider instead
 */
@Injectable()
export class LocalStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get(
      'LOCAL_STORAGE_PATH',
      path.join(process.cwd(), 'uploads'),
    );
    this.baseUrl = this.configService.get('LOCAL_STORAGE_URL', 'http://localhost:3000/uploads');
  }

  async upload(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);
    this.logger.log(`File uploaded locally: ${key}`);

    return key;
  }

  async getSignedUrl(key: string, _expiresIn = 3600): Promise<string> {
    // For local storage, just return the public URL
    // In a real scenario, you might generate a time-limited token
    return `${this.baseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted locally: ${key}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, that's okay
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
