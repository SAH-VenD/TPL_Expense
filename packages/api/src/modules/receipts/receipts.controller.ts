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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiParam({ name: 'expenseId', description: 'Expense ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Receipt file (jpg, png, pdf, heic - max 10MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Receipt uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or expense not in draft status' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
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

  @Get('expense/:expenseId')
  @ApiOperation({ summary: 'Get all receipts for an expense' })
  @ApiParam({ name: 'expenseId', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'List of receipts' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  findByExpense(@Req() req: AuthenticatedRequest, @Param('expenseId') expenseId: string) {
    return this.receiptsService.findByExpense(expenseId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt details' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'Receipt details' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.receiptsService.findOne(id, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned URL for receipt download' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({
    status: 200,
    description: 'Download URL',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiresIn: { type: 'number' },
        filename: { type: 'string' },
        mimeType: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  getDownloadUrl(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.receiptsService.getDownloadUrl(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receipt' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  @ApiResponse({ status: 200, description: 'Receipt deleted' })
  @ApiResponse({ status: 400, description: 'Expense not in draft status' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.receiptsService.remove(id, req.user);
  }
}
