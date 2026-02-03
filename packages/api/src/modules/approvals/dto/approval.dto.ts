import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  MaxLength,
  IsBoolean,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDto {
  @ApiProperty({ description: 'Expense ID to approve' })
  @IsUUID()
  expenseId: string;

  @ApiPropertyOptional({ description: 'Optional comments for the approval' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comments?: string;

  @ApiPropertyOptional({
    description: 'Flag to indicate this is an emergency approval (bypasses tier requirements)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmergencyApproval?: boolean;

  @ApiPropertyOptional({
    description:
      'Required justification for emergency approvals (min 20 characters). Not required for CEO role.',
  })
  @ValidateIf((o) => o.isEmergencyApproval === true)
  @IsString()
  @MinLength(20, { message: 'Emergency reason must be at least 20 characters' })
  emergencyReason?: string;
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

  @ApiPropertyOptional({
    description: 'Flag to indicate this is an emergency bulk approval (bypasses tier requirements)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmergencyApproval?: boolean;

  @ApiPropertyOptional({
    description:
      'Required justification for emergency approvals (min 20 characters). Not required for CEO role.',
  })
  @ValidateIf((o) => o.isEmergencyApproval === true)
  @IsString()
  @MinLength(20, { message: 'Emergency reason must be at least 20 characters' })
  emergencyReason?: string;
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
