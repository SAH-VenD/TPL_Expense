import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Travel' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'TRV' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ example: 'All travel related expenses' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for hierarchy' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  requiresPreApproval?: boolean;

  @ApiPropertyOptional({ enum: TaxType, default: TaxType.NONE })
  @IsEnum(TaxType)
  @IsOptional()
  taxType?: TaxType;

  @ApiPropertyOptional({ example: '1001' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  glCode?: string;
}
