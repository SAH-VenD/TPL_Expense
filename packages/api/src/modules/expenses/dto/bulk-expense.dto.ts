import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkExpenseDto {
  @ApiProperty({ description: 'Array of expense IDs', example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  expenseIds: string[];
}
