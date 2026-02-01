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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { BulkExpenseDto } from './dto/bulk-expense.dto';
import { ExpenseFiltersDto } from './dto/expense-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  findAll(@Req() req: AuthenticatedRequest, @Query() filters: ExpenseFiltersDto) {
    return this.expensesService.findAll(req.user, filters);
  }

  @Post('bulk-submit')
  @ApiOperation({ summary: 'Submit multiple draft expenses' })
  bulkSubmit(@Req() req: AuthenticatedRequest, @Body() bulkExpenseDto: BulkExpenseDto) {
    return this.expensesService.bulkSubmit(req.user.id, bulkExpenseDto.expenseIds);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Delete multiple draft expenses' })
  bulkDelete(@Req() req: AuthenticatedRequest, @Body() bulkExpenseDto: BulkExpenseDto) {
    return this.expensesService.bulkDelete(req.user.id, bulkExpenseDto.expenseIds);
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

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw a submitted expense' })
  withdraw(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.withdraw(id, req.user);
  }

  @Get(':id/approvals')
  @ApiOperation({ summary: 'Get approval history for an expense' })
  getApprovals(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.getApprovals(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft expense' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.expensesService.remove(id, req.user);
  }
}
