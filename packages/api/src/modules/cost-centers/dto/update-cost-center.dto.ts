import { PartialType } from '@nestjs/swagger';
import { CreateCostCenterDto } from './create-cost-center.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCostCenterDto extends PartialType(CreateCostCenterDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
