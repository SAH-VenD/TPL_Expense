import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { S3Provider } from './providers/s3.provider';
import { LocalStorageProvider } from './providers/local.provider';
import { STORAGE_PROVIDER } from './storage.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    S3Provider,
    LocalStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService, s3: S3Provider, local: LocalStorageProvider) => {
        const storageType = configService.get('STORAGE_TYPE', 'local');

        if (storageType === 's3') {
          return s3;
        }

        // Default to local storage for development
        return local;
      },
      inject: [ConfigService, S3Provider, LocalStorageProvider],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
