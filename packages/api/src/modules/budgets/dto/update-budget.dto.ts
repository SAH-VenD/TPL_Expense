import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBudgetDto extends PartialType(OmitType(CreateBudgetDto, ['type'] as const)) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
