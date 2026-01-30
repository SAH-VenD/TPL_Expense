# Skill: OCR Integration

## Context
This skill contains the implementation patterns for receipt OCR using AWS Textract, with abstraction for swapping to open-source alternatives. Reference this when implementing receipt scanning and data extraction.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Receipt   │────►│  OCR Service │────►│  Extracted Data │
│   Upload    │     │  Abstraction │     │   (Structured)  │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │  AWS     │ │ Tesseract│ │ PaddleOCR│
       │ Textract │ │  (OSS)   │ │  (OSS)   │
       └──────────┘ └──────────┘ └──────────┘
```

---

## OCR Service Interface

### Abstraction Layer

```typescript
// Interface that all OCR providers must implement
interface OCRService {
  /**
   * Extract data from a receipt image
   */
  extractFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<OCRExtractionResult>;

  /**
   * Extract data from a PDF document
   */
  extractFromPDF(
    pdfBuffer: Buffer
  ): Promise<OCRExtractionResult>;

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}

interface OCRExtractionResult {
  success: boolean;
  confidence: number;           // 0-100 overall confidence

  // Extracted fields
  data: {
    vendorName?: ExtractedField;
    vendorAddress?: ExtractedField;
    receiptNumber?: ExtractedField;
    invoiceNumber?: ExtractedField;
    date?: ExtractedField;
    totalAmount?: ExtractedField;
    currency?: ExtractedField;
    taxAmount?: ExtractedField;
    subtotal?: ExtractedField;
    lineItems?: ExtractedLineItem[];
  };

  // Raw response for debugging
  rawResponse?: any;

  // Processing metadata
  processingTime: number;       // milliseconds
  provider: string;
}

interface ExtractedField {
  value: string | number;
  confidence: number;           // 0-100 field-level confidence
  boundingBox?: BoundingBox;    // Location in image
}

interface ExtractedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  confidence: number;
}

interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}
```

---

## AWS Textract Implementation

### Service Implementation

```typescript
import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';

@Injectable()
export class AWSTextractService implements OCRService {
  private client: TextractClient;

  constructor(private configService: ConfigService) {
    this.client = new TextractClient({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  getProviderName(): string {
    return 'AWS_TEXTRACT';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check
      return !!(
        this.configService.get('AWS_ACCESS_KEY_ID') &&
        this.configService.get('AWS_SECRET_ACCESS_KEY')
      );
    } catch {
      return false;
    }
  }

  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<OCRExtractionResult> {
    const startTime = Date.now();

    try {
      const command = new AnalyzeExpenseCommand({
        Document: {
          Bytes: imageBuffer,
        },
      });

      const response = await this.client.send(command);

      return this.parseTextractResponse(response, startTime);
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        data: {},
        processingTime: Date.now() - startTime,
        provider: this.getProviderName(),
        error: error.message,
      };
    }
  }

  async extractFromPDF(pdfBuffer: Buffer): Promise<OCRExtractionResult> {
    // For PDFs, we need to use async operations with S3
    // This is a simplified version - production would use StartExpenseAnalysis
    return this.extractFromImage(pdfBuffer, 'application/pdf');
  }

  private parseTextractResponse(
    response: any,
    startTime: number
  ): OCRExtractionResult {
    const result: OCRExtractionResult = {
      success: true,
      confidence: 0,
      data: {},
      processingTime: Date.now() - startTime,
      provider: this.getProviderName(),
      rawResponse: response,
    };

    // Parse expense documents
    if (response.ExpenseDocuments && response.ExpenseDocuments.length > 0) {
      const doc = response.ExpenseDocuments[0];

      // Extract summary fields
      if (doc.SummaryFields) {
        for (const field of doc.SummaryFields) {
          const fieldType = field.Type?.Text;
          const value = field.ValueDetection?.Text;
          const confidence = field.ValueDetection?.Confidence || 0;

          switch (fieldType) {
            case 'VENDOR_NAME':
              result.data.vendorName = { value, confidence };
              break;
            case 'VENDOR_ADDRESS':
              result.data.vendorAddress = { value, confidence };
              break;
            case 'INVOICE_RECEIPT_ID':
              result.data.receiptNumber = { value, confidence };
              break;
            case 'INVOICE_RECEIPT_DATE':
              result.data.date = { value, confidence };
              break;
            case 'TOTAL':
              result.data.totalAmount = {
                value: this.parseAmount(value),
                confidence
              };
              break;
            case 'SUBTOTAL':
              result.data.subtotal = {
                value: this.parseAmount(value),
                confidence
              };
              break;
            case 'TAX':
              result.data.taxAmount = {
                value: this.parseAmount(value),
                confidence
              };
              break;
          }
        }
      }

      // Extract line items
      if (doc.LineItemGroups) {
        result.data.lineItems = [];

        for (const group of doc.LineItemGroups) {
          for (const lineItem of group.LineItems || []) {
            const item: ExtractedLineItem = {
              description: '',
              amount: 0,
              confidence: 0,
            };

            for (const field of lineItem.LineItemExpenseFields || []) {
              const type = field.Type?.Text;
              const value = field.ValueDetection?.Text;
              const conf = field.ValueDetection?.Confidence || 0;

              switch (type) {
                case 'ITEM':
                  item.description = value;
                  break;
                case 'QUANTITY':
                  item.quantity = parseFloat(value) || undefined;
                  break;
                case 'UNIT_PRICE':
                  item.unitPrice = this.parseAmount(value);
                  break;
                case 'PRICE':
                  item.amount = this.parseAmount(value);
                  break;
              }

              item.confidence = Math.max(item.confidence, conf);
            }

            if (item.description || item.amount) {
              result.data.lineItems.push(item);
            }
          }
        }
      }
    }

    // Calculate overall confidence
    const confidences = Object.values(result.data)
      .filter(f => f && typeof f === 'object' && 'confidence' in f)
      .map(f => (f as ExtractedField).confidence);

    result.confidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    return result;
  }

  private parseAmount(value: string): number {
    if (!value) return 0;

    // Remove currency symbols and commas
    const cleaned = value
      .replace(/[^0-9.-]/g, '')
      .replace(/,/g, '');

    return parseFloat(cleaned) || 0;
  }
}
```

---

## Open Source Fallback (Tesseract)

### Tesseract Implementation

```typescript
import Tesseract from 'tesseract.js';

@Injectable()
export class TesseractOCRService implements OCRService {
  getProviderName(): string {
    return 'TESSERACT';
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available as it's bundled
  }

  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<OCRExtractionResult> {
    const startTime = Date.now();

    try {
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => {}, // Suppress logs
      });

      return this.parseOCRText(data.text, data.confidence, startTime);
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        data: {},
        processingTime: Date.now() - startTime,
        provider: this.getProviderName(),
        error: error.message,
      };
    }
  }

  async extractFromPDF(pdfBuffer: Buffer): Promise<OCRExtractionResult> {
    // Convert PDF to images first, then process
    // This requires additional setup with pdf-lib or similar
    throw new Error('PDF extraction not supported with Tesseract - convert to image first');
  }

  private parseOCRText(
    text: string,
    confidence: number,
    startTime: number
  ): OCRExtractionResult {
    const result: OCRExtractionResult = {
      success: true,
      confidence: confidence,
      data: {},
      processingTime: Date.now() - startTime,
      provider: this.getProviderName(),
    };

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Pattern matching for common receipt fields
    for (const line of lines) {
      // Total amount patterns
      if (/total|amount|sum|grand/i.test(line)) {
        const amount = this.extractAmount(line);
        if (amount) {
          result.data.totalAmount = { value: amount, confidence };
        }
      }

      // Tax patterns
      if (/tax|vat|gst/i.test(line)) {
        const amount = this.extractAmount(line);
        if (amount) {
          result.data.taxAmount = { value: amount, confidence };
        }
      }

      // Date patterns
      const dateMatch = line.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/);
      if (dateMatch) {
        result.data.date = { value: dateMatch[0], confidence };
      }

      // Receipt/Invoice number patterns
      if (/receipt|invoice|bill|ref/i.test(line)) {
        const numMatch = line.match(/[#:]?\s*([A-Z0-9-]+)/i);
        if (numMatch) {
          result.data.receiptNumber = { value: numMatch[1], confidence };
        }
      }
    }

    // First non-numeric line is likely vendor name
    const vendorLine = lines.find(l => !/^\d/.test(l) && l.length > 3);
    if (vendorLine) {
      result.data.vendorName = { value: vendorLine, confidence: confidence * 0.7 };
    }

    return result;
  }

  private extractAmount(text: string): number | null {
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return null;
  }
}
```

---

## OCR Service Factory

### Provider Selection

```typescript
@Injectable()
export class OCRServiceFactory {
  constructor(
    private textractService: AWSTextractService,
    private tesseractService: TesseractOCRService,
    private configService: ConfigService,
  ) {}

  async getService(): Promise<OCRService> {
    const preferredProvider = this.configService.get('OCR_PROVIDER', 'AWS_TEXTRACT');

    switch (preferredProvider) {
      case 'AWS_TEXTRACT':
        if (await this.textractService.isAvailable()) {
          return this.textractService;
        }
        console.warn('AWS Textract not available, falling back to Tesseract');
        return this.tesseractService;

      case 'TESSERACT':
        return this.tesseractService;

      default:
        throw new Error(`Unknown OCR provider: ${preferredProvider}`);
    }
  }
}
```

---

## Receipt Processing Service

### Complete Processing Flow

```typescript
@Injectable()
export class ReceiptProcessingService {
  constructor(
    private ocrFactory: OCRServiceFactory,
    private s3Service: S3Service,
    private prisma: PrismaService,
    private vendorService: VendorService,
  ) {}

  async processReceipt(
    file: Express.Multer.File,
    expenseId: string
  ): Promise<ProcessedReceipt> {
    // 1. Upload to S3
    const s3Path = await this.s3Service.upload(file, 'receipts');

    // 2. Create receipt record
    const receipt = await this.prisma.receipt.create({
      data: {
        expenseId,
        filePath: s3Path,
        fileType: file.mimetype,
        fileSize: file.size,
        originalFileName: file.originalname,
        ocrProcessed: false,
      },
    });

    // 3. Run OCR
    const ocrService = await this.ocrFactory.getService();
    const ocrResult = await ocrService.extractFromImage(file.buffer, file.mimetype);

    // 4. Update receipt with OCR data
    await this.prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        ocrProcessed: true,
        ocrConfidence: ocrResult.confidence,
        ocrData: ocrResult.data,
      },
    });

    // 5. Auto-categorize if vendor recognized
    let suggestedCategory = null;
    if (ocrResult.data.vendorName) {
      const vendor = await this.vendorService.findOrCreateByName(
        ocrResult.data.vendorName.value as string
      );
      suggestedCategory = vendor.defaultCategoryId;
    }

    // 6. Return processed result
    return {
      receiptId: receipt.id,
      ocrSuccess: ocrResult.success,
      ocrConfidence: ocrResult.confidence,
      extractedData: this.mapToFormFields(ocrResult.data),
      suggestedCategory,
      requiresReview: ocrResult.confidence < 80,
      lowConfidenceFields: this.getLowConfidenceFields(ocrResult.data),
    };
  }

  private mapToFormFields(data: OCRExtractionResult['data']): ExpenseFormData {
    return {
      vendorName: data.vendorName?.value as string,
      vendorAddress: data.vendorAddress?.value as string,
      receiptNumber: data.receiptNumber?.value as string,
      invoiceNumber: data.invoiceNumber?.value as string,
      date: this.parseDate(data.date?.value as string),
      amount: data.totalAmount?.value as number,
      taxAmount: data.taxAmount?.value as number,
      lineItems: data.lineItems,
    };
  }

  private getLowConfidenceFields(data: OCRExtractionResult['data']): string[] {
    const lowConfidence: string[] = [];
    const THRESHOLD = 80;

    for (const [field, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'confidence' in value) {
        if (value.confidence < THRESHOLD) {
          lowConfidence.push(field);
        }
      }
    }

    return lowConfidence;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    // Try various date formats
    const formats = [
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'YYYY-MM-DD',
      'DD-MM-YYYY',
      'D/M/YYYY',
      'D/M/YY',
    ];

    for (const format of formats) {
      const parsed = dayjs(dateString, format);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    return null;
  }
}
```

---

## Currency Detection

### Detecting Currency from Receipt

```typescript
const CURRENCY_PATTERNS = {
  PKR: [/Rs\.?/i, /PKR/i, /Rupees?/i],
  USD: [/\$/, /USD/, /US\s*Dollars?/i],
  GBP: [/£/, /GBP/, /Pounds?/i],
  SAR: [/SR\.?/, /SAR/, /Riyals?/i],
  AED: [/AED/, /Dirhams?/i],
};

function detectCurrency(text: string): string | null {
  for (const [currency, patterns] of Object.entries(CURRENCY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return currency;
      }
    }
  }
  return null;
}
```

---

## Vendor Learning

### Auto-Categorization

```typescript
@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateByName(name: string): Promise<Vendor> {
    // Normalize name for matching
    const normalized = this.normalizeName(name);

    // Try exact match
    let vendor = await this.prisma.vendor.findFirst({
      where: { normalizedName: normalized },
    });

    if (vendor) return vendor;

    // Try alias match
    vendor = await this.prisma.vendor.findFirst({
      where: {
        aliases: { has: normalized },
      },
    });

    if (vendor) {
      // Add new alias
      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          aliases: { push: name },
        },
      });
      return vendor;
    }

    // Create new vendor
    return this.prisma.vendor.create({
      data: {
        name,
        normalizedName: normalized,
        aliases: [],
        isVerified: false,
      },
    });
  }

  async updateVendorCategory(
    vendorId: string,
    categoryId: string
  ): Promise<Vendor> {
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { defaultCategoryId: categoryId },
    });
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}
```

---

## Image Pre-processing

### Improving OCR Accuracy

```typescript
import sharp from 'sharp';

async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    // Convert to grayscale
    .grayscale()
    // Increase contrast
    .normalize()
    // Slight sharpening
    .sharpen()
    // Resize if too large (Textract has limits)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    // Output as PNG for best OCR results
    .png()
    .toBuffer();
}

async function checkImageQuality(imageBuffer: Buffer): Promise<ImageQualityResult> {
  const metadata = await sharp(imageBuffer).metadata();

  const issues: string[] = [];

  // Check resolution
  if (metadata.width < 300 || metadata.height < 300) {
    issues.push('Image resolution too low (minimum 300x300)');
  }

  // Check file size
  if (imageBuffer.length < 10000) {
    issues.push('Image file size too small, may be low quality');
  }

  // Check format
  const supportedFormats = ['jpeg', 'png', 'webp', 'tiff'];
  if (!supportedFormats.includes(metadata.format)) {
    issues.push(`Unsupported format: ${metadata.format}`);
  }

  return {
    isAcceptable: issues.length === 0,
    issues,
    metadata: {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length,
    },
  };
}
```

---

## Error Handling

### OCR-Specific Errors

```typescript
export class OCRProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'OCRProcessingError';
  }
}

const OCR_ERRORS = {
  IMAGE_TOO_LARGE: new OCRProcessingError(
    'Image exceeds maximum size limit',
    'OCR_IMAGE_TOO_LARGE',
    false
  ),
  UNSUPPORTED_FORMAT: new OCRProcessingError(
    'Image format not supported',
    'OCR_UNSUPPORTED_FORMAT',
    false
  ),
  LOW_QUALITY: new OCRProcessingError(
    'Image quality too low for OCR',
    'OCR_LOW_QUALITY',
    false
  ),
  SERVICE_UNAVAILABLE: new OCRProcessingError(
    'OCR service temporarily unavailable',
    'OCR_SERVICE_UNAVAILABLE',
    true
  ),
  RATE_LIMITED: new OCRProcessingError(
    'OCR rate limit exceeded',
    'OCR_RATE_LIMITED',
    true
  ),
};
```

---

## Configuration

### Environment Variables

```bash
# OCR Provider Selection
OCR_PROVIDER=AWS_TEXTRACT  # or TESSERACT

# AWS Textract (if using)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# OCR Settings
OCR_CONFIDENCE_THRESHOLD=80  # Flag for review below this
OCR_MAX_FILE_SIZE=10485760   # 10MB
OCR_SUPPORTED_FORMATS=image/jpeg,image/png,image/webp,application/pdf
```

### Module Configuration

```typescript
@Module({
  imports: [
    ConfigModule,
    // Using Prisma for database access
  ],
  providers: [
    PrismaService,
    AWSTextractService,
    TesseractOCRService,
    OCRServiceFactory,
    ReceiptProcessingService,
    VendorService,
  ],
  exports: [
    ReceiptProcessingService,
    OCRServiceFactory,
  ],
})
export class OCRModule {}
```
