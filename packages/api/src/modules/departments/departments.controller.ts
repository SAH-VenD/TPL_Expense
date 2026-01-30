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
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Departments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Create a new department (Admin only)',
    description:
      'Creates a new department with unique name and code. Optionally set a parent for hierarchy.',
  })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Name or code already exists' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all departments as tree structure',
    description:
      'Returns departments in a nested tree structure with children. Use for displaying organizational hierarchy.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive departments in the response',
  })
  @ApiResponse({ status: 200, description: 'List of departments in tree structure' })
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.departmentsService.findAll(includeInactive);
  }

  @Get('flat')
  @ApiOperation({
    summary: 'Get all departments as flat list',
    description:
      'Returns departments in a flat list format. Ideal for dropdowns and select inputs.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive departments in the response',
  })
  @ApiResponse({ status: 200, description: 'Flat list of departments' })
  findAllFlat(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.departmentsService.findAllFlat(includeInactive);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a department by ID',
    description: 'Returns a single department with its children, parent, and user count.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department details' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Update a department (Admin only)',
    description:
      'Updates department details. Validates unique name/code and prevents circular parent references.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or circular reference' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 409, description: 'Name or code already exists' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Soft delete a department (Admin only)',
    description:
      'Deactivates a department. Cannot deactivate if there are active users or child departments.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate - has active users or children' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.softDelete(id);
  }

  @Post(':id/reactivate')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Reactivate a department (Admin only)',
    description: 'Reactivates an inactive department. Parent must be active if one is set.',
  })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department reactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot reactivate - parent is inactive' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.reactivate(id);
  }
}
