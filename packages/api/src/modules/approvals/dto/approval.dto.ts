import { IsString, IsUUID, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDto {
  @ApiProperty()
  @IsUUID()
  expenseId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comments?: string;
}

export class BulkApproveDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  expenseIds: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comments?: string;
}

export class RejectDto {
  @ApiProperty()
  @IsUUID()
  expenseId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ClarifyDto {
  @ApiProperty()
  @IsUUID()
  expenseId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  question: string;
}
