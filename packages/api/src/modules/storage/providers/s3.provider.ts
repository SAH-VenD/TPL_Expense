import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Provider {
  private readonly logger = new Logger(S3Provider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const isLocal = this.configService.get('NODE_ENV') !== 'production';

    this.client = new S3Client({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      ...(isLocal && {
        endpoint: this.configService.get('AWS_ENDPOINT', 'http://localhost:4566'),
        forcePathStyle: true,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    });

    this.bucket = this.configService.get('AWS_S3_BUCKET', 'expense-receipts');
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.client.send(command);
      this.logger.log(`File uploaded: ${key}`);

      return key;
    } catch (error) {
      this.logger.error(
        'Failed to upload file',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('File storage operation failed');
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        'Failed to get signed URL',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('File storage operation failed');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(
        'Failed to delete file',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('File storage operation failed');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}
