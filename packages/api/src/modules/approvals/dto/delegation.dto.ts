import { IsString, IsUUID, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDelegationDto {
  @ApiProperty()
  @IsUUID()
  delegateId: string;

  @ApiProperty({ example: '2024-03-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Out of office - vacation' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class RevokeDelegationDto {
  @ApiProperty()
  @IsUUID()
  delegationId: string;
}
