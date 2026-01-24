import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { S3Provider } from './providers/s3.provider';

@Global()
@Module({
  providers: [StorageService, S3Provider],
  exports: [StorageService],
})
export class StorageModule {}
