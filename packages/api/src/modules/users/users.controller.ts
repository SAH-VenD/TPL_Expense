import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleType, UserStatus, User } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.FINANCE)
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: RoleType })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('role') role?: RoleType,
    @Query('status') status?: UserStatus,
  ) {
    return this.usersService.findAll({
      page,
      pageSize,
      search,
      departmentId,
      role,
      status,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.FINANCE)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/approve')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Approve pending user registration' })
  approve(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Post(':id/deactivate')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Deactivate user account' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(':id/reactivate')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Reactivate user account' })
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }

  @Post('bulk-import')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Bulk import users from CSV data' })
  bulkImport(@Body() users: CreateUserDto[]) {
    return this.usersService.bulkImport(users);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
