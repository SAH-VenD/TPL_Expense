import { IsUUID, IsNumber, IsString, Min, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferBudgetDto {
  @ApiProperty({ description: 'ID of the budget to transfer from' })
  @IsUUID()
  fromBudgetId: string;

  @ApiProperty({ description: 'ID of the budget to transfer to' })
  @IsUUID()
  toBudgetId: string;

  @ApiProperty({ description: 'Amount to transfer', example: 50000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Reason for the transfer' })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
