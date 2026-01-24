import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Marketing Operations' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'CC-MKT-001' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ example: 'Cost center for marketing activities' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
