import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType, BudgetType } from '@prisma/client';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new budget' })
  create(@Body() createBudgetDto: CreateBudgetDto) {
    return this.budgetsService.create(createBudgetDto);
  }

  @Get()
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiQuery({ name: 'type', enum: BudgetType, required: false })
  findAll(@Query('type') type?: BudgetType) {
    return this.budgetsService.findAll(type);
  }

  @Get(':id')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get a budget by ID' })
  findOne(@Param('id') id: string) {
    return this.budgetsService.findOne(id);
  }

  @Get(':id/utilization')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get budget utilization details' })
  getUtilization(@Param('id') id: string) {
    return this.budgetsService.getUtilization(id);
  }

  @Patch(':id')
  @Roles(RoleType.FINANCE, RoleType.ADMIN)
  @ApiOperation({ summary: 'Update a budget' })
  update(@Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto) {
    return this.budgetsService.update(id, updateBudgetDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Delete a budget' })
  remove(@Param('id') id: string) {
    return this.budgetsService.remove(id);
  }
}
