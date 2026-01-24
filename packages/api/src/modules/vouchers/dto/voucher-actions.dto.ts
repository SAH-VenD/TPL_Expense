import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisburseVoucherDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'CASH' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'CASH-2024-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentReference?: string;
}

export class SettleVoucherDto {
  @ApiPropertyOptional({ example: 'All expenses documented and receipts attached' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
