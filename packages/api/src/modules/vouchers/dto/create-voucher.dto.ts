import { IsString, IsNumber, IsOptional, IsDateString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoucherDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  requestedAmount: number;

  @ApiProperty({ example: 'Office supplies and refreshments for team meeting' })
  @IsString()
  @MaxLength(1000)
  purpose: string;

  @ApiPropertyOptional({ example: '2024-04-15' })
  @IsDateString()
  @IsOptional()
  settlementDeadline?: string;
}
