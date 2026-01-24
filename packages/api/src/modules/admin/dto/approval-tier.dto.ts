import { IsString, IsNumber, IsEnum, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

export class CreateApprovalTierDto {
  @ApiProperty({ example: 'Manager Approval' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  tierOrder: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minAmount: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  maxAmount: number;

  @ApiProperty({ enum: RoleType })
  @IsEnum(RoleType)
  approverRole: RoleType;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  escalationDays?: number;
}
