import { IsString, IsOptional, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'Engineering',
    description: 'Department name (must be unique)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'ENG',
    description: 'Department code (uppercase, must be unique)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must be uppercase letters, numbers, underscores or hyphens only',
  })
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiPropertyOptional({
    example: 'Software development and engineering department',
    description: 'Department description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent department ID for hierarchy',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
