import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { TextractProvider } from './providers/textract.provider';

@Module({
  providers: [OcrService, TextractProvider],
  exports: [OcrService],
})
export class OcrModule {}
