import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoucherDto {
  @ApiProperty({ example: 50000, description: 'Requested amount in PKR (max 50000)' })
  @IsNumber()
  @Min(1, { message: 'Requested amount must be positive' })
  requestedAmount: number;

  @ApiProperty({
    example: 'Office supplies and refreshments for team meeting',
    description: 'Purpose of petty cash request (minimum 10 characters)',
  })
  @IsString()
  @MinLength(10, { message: 'Purpose must be at least 10 characters long' })
  @MaxLength(1000)
  purpose: string;

  @ApiPropertyOptional({ example: '2024-04-15' })
  @IsDateString()
  @IsOptional()
  settlementDeadline?: string;
}
