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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new expense category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Category code already exists' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories as tree structure' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive categories (default: false)',
  })
  @ApiResponse({ status: 200, description: 'Categories tree returned successfully' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.categoriesService.findAll(include);
  }

  @Get('flat')
  @ApiOperation({ summary: 'Get all categories as flat list (for dropdowns)' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Return only active categories (default: true)',
  })
  @ApiResponse({ status: 200, description: 'Flat category list returned successfully' })
  findAllFlat(@Query('activeOnly') activeOnly?: string) {
    const active = activeOnly !== 'false';
    return this.categoriesService.findAllFlat(active);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get categories as hierarchical tree structure' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive categories (default: false)',
  })
  @ApiResponse({ status: 200, description: 'Category tree returned successfully' })
  findTree(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.categoriesService.findTree(include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category by ID with children' })
  @ApiParam({ name: 'id', type: String, description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a category by its unique code' })
  @ApiParam({ name: 'code', type: String, description: 'Category code (e.g., TRAVEL)' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findByCode(@Param('code') code: string) {
    return this.categoriesService.findByCode(code.toUpperCase());
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or circular reference' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category code already exists' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Soft delete a category (set isActive=false) (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete category with active expenses' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.softDelete(id);
  }

  @Post(':id/reactivate')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Reactivate a deactivated category (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category reactivated successfully' })
  @ApiResponse({ status: 400, description: 'Category is already active or parent is inactive' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.reactivate(id);
  }
}
