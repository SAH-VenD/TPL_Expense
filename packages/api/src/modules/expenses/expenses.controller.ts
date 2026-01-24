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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpenseStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../../common/types/request';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  create(@Req() req: AuthenticatedRequest, @Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, createExpenseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses for current user' })
  @ApiQuery({ name: 'status', enum: ExpenseStatus, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: ExpenseStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.expensesService.findAll(req.user, { status, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, req.user, updateExpenseDto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit an expense for approval' })
  submit(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.submit(id, req.user);
  }

  @Post(':id/resubmit')
  @ApiOperation({ summary: 'Resubmit a rejected expense' })
  resubmit(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.resubmit(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft expense' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.remove(id, req.user);
  }
}
