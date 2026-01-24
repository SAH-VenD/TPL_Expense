import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/request';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post(':expenseId')
  @ApiOperation({ summary: 'Upload a receipt for an expense' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('expenseId') expenseId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf|heic)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.receiptsService.upload(expenseId, req.user, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt details' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.receiptsService.findOne(id, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned URL for receipt download' })
  getDownloadUrl(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.receiptsService.getDownloadUrl(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receipt' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.receiptsService.remove(id, req.user);
  }
}
