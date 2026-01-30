import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextractClient, AnalyzeExpenseCommand, ExpenseDocument } from '@aws-sdk/client-textract';
import { S3Client } from '@aws-sdk/client-s3';

export interface OcrResult {
  vendorName?: string;
  vendorAddress?: string;
  date?: string;
  amount?: number;
  taxAmount?: number;
  total?: number;
  currency?: string;
  invoiceNumber?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  confidence: number;
  rawData?: any;
}

@Injectable()
export class TextractProvider {
  private readonly logger = new Logger(TextractProvider.name);
  private readonly textractClient: TextractClient;
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const isLocal = this.configService.get('NODE_ENV') !== 'production';
    const region = this.configService.get('AWS_REGION', 'us-east-1');

    const clientConfig = {
      region,
      ...(isLocal && {
        endpoint: this.configService.get('AWS_ENDPOINT', 'http://localhost:4566'),
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    };

    this.textractClient = new TextractClient(clientConfig);
    this.s3Client = new S3Client({
      ...clientConfig,
      ...(isLocal && { forcePathStyle: true }),
    });

    this.bucket = this.configService.get('AWS_S3_BUCKET', 'expense-receipts');
  }

  async analyzeExpense(s3Key: string): Promise<OcrResult> {
    try {
      const command = new AnalyzeExpenseCommand({
        Document: {
          S3Object: {
            Bucket: this.bucket,
            Name: s3Key,
          },
        },
      });

      const response = await this.textractClient.send(command);

      return this.parseExpenseResponse(response.ExpenseDocuments || []);
    } catch (error) {
      this.logger.error(`Textract error: ${error.message}`);

      // Return mock data in development if Textract is not available
      if (this.configService.get('NODE_ENV') !== 'production') {
        return this.getMockResult();
      }

      throw error;
    }
  }

  private parseExpenseResponse(documents: ExpenseDocument[]): OcrResult {
    if (documents.length === 0) {
      return { confidence: 0 };
    }

    const doc = documents[0];
    const summaryFields = doc.SummaryFields || [];
    const lineItemGroups = doc.LineItemGroups || [];

    const result: OcrResult = {
      confidence: 0,
    };

    let totalConfidence = 0;
    let fieldCount = 0;

    for (const field of summaryFields) {
      const type = field.Type?.Text?.toUpperCase();
      const value = field.ValueDetection?.Text;
      const confidence = field.ValueDetection?.Confidence || 0;

      if (!value) continue;

      totalConfidence += confidence;
      fieldCount++;

      switch (type) {
        case 'VENDOR_NAME':
          result.vendorName = value;
          break;
        case 'VENDOR_ADDRESS':
          result.vendorAddress = value;
          break;
        case 'INVOICE_RECEIPT_DATE':
          result.date = value;
          break;
        case 'SUBTOTAL':
          result.amount = this.parseAmount(value);
          break;
        case 'TAX':
          result.taxAmount = this.parseAmount(value);
          break;
        case 'TOTAL':
          result.total = this.parseAmount(value);
          break;
        case 'INVOICE_RECEIPT_ID':
          result.invoiceNumber = value;
          break;
      }
    }

    // Parse line items
    result.lineItems = [];
    for (const group of lineItemGroups) {
      for (const item of group.LineItems || []) {
        const lineItem: any = {};

        for (const expense of item.LineItemExpenseFields || []) {
          const type = expense.Type?.Text?.toUpperCase();
          const value = expense.ValueDetection?.Text;

          switch (type) {
            case 'ITEM':
              lineItem.description = value;
              break;
            case 'QUANTITY':
              lineItem.quantity = parseFloat(value || '0');
              break;
            case 'UNIT_PRICE':
              lineItem.unitPrice = this.parseAmount(value || '0');
              break;
            case 'PRICE':
              lineItem.amount = this.parseAmount(value || '0');
              break;
          }
        }

        if (lineItem.description) {
          result.lineItems.push(lineItem);
        }
      }
    }

    result.confidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
    result.rawData = documents;

    return result;
  }

  private parseAmount(value: string): number {
    // Remove currency symbols and parse
    const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '');
    return parseFloat(cleaned) || 0;
  }

  private getMockResult(): OcrResult {
    return {
      vendorName: 'Sample Vendor',
      date: new Date().toISOString().split('T')[0],
      amount: 1000,
      taxAmount: 170,
      total: 1170,
      currency: 'PKR',
      confidence: 85,
      lineItems: [
        {
          description: 'Sample Item',
          quantity: 1,
          unitPrice: 1000,
          amount: 1000,
        },
      ],
    };
  }
}
