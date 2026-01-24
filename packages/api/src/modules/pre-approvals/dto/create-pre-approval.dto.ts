import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsDateString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TravelDetailsDto {
  @ApiPropertyOptional({ example: 'Dubai' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsDateString()
  @IsOptional()
  departureDate?: string;

  @ApiPropertyOptional({ example: '2024-03-20' })
  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @ApiPropertyOptional({ example: 'Client meeting and contract signing' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  purpose?: string;
}

export class CreatePreApprovalDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  estimatedAmount: number;

  @ApiProperty({ example: 'Business trip to Dubai for client meeting' })
  @IsString()
  @MaxLength(1000)
  purpose: string;

  @ApiPropertyOptional({ type: TravelDetailsDto })
  @ValidateNested()
  @Type(() => TravelDetailsDto)
  @IsOptional()
  travelDetails?: TravelDetailsDto;

  @ApiPropertyOptional({ example: '2024-04-15' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
