import { IsUUID, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckExpenseDto {
  @ApiProperty({ description: 'Amount of the expense in PKR', example: 15000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Department ID for the expense' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Project ID for the expense' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Cost center ID for the expense' })
  @IsUUID()
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Category ID for the expense' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Employee ID for the expense' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Specific budget ID to check against' })
  @IsUUID()
  @IsOptional()
  budgetId?: string;

  @ApiPropertyOptional({
    description: 'Date of the expense (defaults to today)',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsOptional()
  expenseDate?: string;
}
