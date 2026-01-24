import { IsString, IsOptional, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'Uber Technologies' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: '12345-6789012-3' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ example: '123 Main St, Karachi' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: '+92-21-12345678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'billing@uber.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'https://uber.com' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  website?: string;
}
