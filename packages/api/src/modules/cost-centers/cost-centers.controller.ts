import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Cost Centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.FINANCE)
  @ApiOperation({ summary: 'Create a new cost center' })
  create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.create(createCostCenterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cost centers' })
  findAll() {
    return this.costCentersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cost center by ID' })
  findOne(@Param('id') id: string) {
    return this.costCentersService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.FINANCE)
  @ApiOperation({ summary: 'Update a cost center' })
  update(@Param('id') id: string, @Body() updateCostCenterDto: UpdateCostCenterDto) {
    return this.costCentersService.update(id, updateCostCenterDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Delete a cost center' })
  remove(@Param('id') id: string) {
    return this.costCentersService.remove(id);
  }
}
