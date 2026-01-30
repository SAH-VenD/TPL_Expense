import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Travel', description: 'Category name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'TRAVEL',
    description: 'Unique category code (uppercase)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must be uppercase letters, numbers, and underscores only',
  })
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiPropertyOptional({
    example: 'All travel related expenses including flights, hotels, and transportation',
    description: 'Detailed description of the category',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID for hierarchical structure',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether receipts are required for expenses in this category',
  })
  @IsBoolean()
  @IsOptional()
  requiresReceipt?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether pre-approval is required before submitting expenses',
  })
  @IsBoolean()
  @IsOptional()
  requiresPreApproval?: boolean;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Maximum allowed amount for expenses in this category (PKR)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  maxAmount?: number;
}
