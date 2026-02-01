import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '@prisma/client';

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  parent?: Category | null;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    // Validate unique code
    const existingCode = await this.prisma.category.findUnique({
      where: { code: dto.code },
    });

    if (existingCode) {
      throw new ConflictException(`Category with code '${dto.code}' already exists`);
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }

      if (!parent.isActive) {
        throw new BadRequestException('Cannot assign to an inactive parent category');
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        requiresReceipt: dto.requiresReceipt ?? true,
        requiresPreApproval: dto.requiresPreApproval ?? false,
        maxAmount: dto.maxAmount,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async findAll(includeInactive = false): Promise<CategoryWithChildren[]> {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          where: includeInactive ? {} : { isActive: true },
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure from root categories
    return this.buildTree(categories as CategoryWithChildren[], null);
  }

  async findAllFlat(activeOnly = true) {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : {},
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        parentId: true,
        requiresReceipt: true,
        requiresPreApproval: true,
        maxAmount: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findTree(includeInactive = false) {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });

    return this.buildTree(categories as CategoryWithChildren[], null);
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            isActive: true,
            requiresReceipt: true,
            requiresPreApproval: true,
            maxAmount: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return category;
  }

  async findByCode(code: string) {
    const category = await this.prisma.category.findUnique({
      where: { code },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with code '${code}' not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existingCategory = await this.findOne(id);

    // Validate unique code if it's being changed
    if (dto.code && dto.code !== existingCategory.code) {
      const codeExists = await this.prisma.category.findUnique({
        where: { code: dto.code },
      });

      if (codeExists) {
        throw new ConflictException(`Category with code '${dto.code}' already exists`);
      }
    }

    // Validate parent exists if provided and prevent circular reference
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }

      if (!parent.isActive) {
        throw new BadRequestException('Cannot assign to an inactive parent category');
      }

      // Check for circular reference in the hierarchy
      await this.validateNoCircularReference(id, dto.parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        requiresReceipt: dto.requiresReceipt,
        requiresPreApproval: dto.requiresPreApproval,
        maxAmount: dto.maxAmount,
        isActive: dto.isActive,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async softDelete(id: string) {
    const category = await this.findOne(id);

    // Check if category has active expenses
    const activeExpenses = await this.prisma.expense.count({
      where: {
        categoryId: id,
        status: {
          notIn: ['PAID', 'REJECTED'],
        },
      },
    });

    if (activeExpenses > 0) {
      throw new BadRequestException(
        `Cannot deactivate category with ${activeExpenses} active expense(s). Please resolve them first.`,
      );
    }

    // Deactivate the category
    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Optionally deactivate all child categories as well
    await this.prisma.category.updateMany({
      where: { parentId: id },
      data: { isActive: false },
    });

    return {
      message: `Category '${category.name}' has been deactivated`,
      category: updatedCategory,
    };
  }

  async reactivate(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (category.isActive) {
      throw new BadRequestException('Category is already active');
    }

    // If category has a parent, ensure parent is active
    if (category.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: category.parentId },
      });

      if (parent && !parent.isActive) {
        throw new BadRequestException(
          'Cannot reactivate category while parent category is inactive',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: { isActive: true },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Build a tree structure from flat array of categories
   */
  private buildTree(
    categories: CategoryWithChildren[],
    parentId: string | null,
  ): CategoryWithChildren[] {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .map((cat) => ({
        ...cat,
        children: this.buildTree(categories, cat.id),
      }));
  }

  /**
   * Validate that setting a new parent won't create a circular reference
   */
  private async validateNoCircularReference(
    categoryId: string,
    newParentId: string,
  ): Promise<void> {
    // Get all descendants of the current category
    const descendants = await this.getAllDescendantIds(categoryId);

    if (descendants.includes(newParentId)) {
      throw new BadRequestException(
        'Cannot set parent: this would create a circular reference in the category hierarchy',
      );
    }
  }

  /**
   * Recursively get all descendant IDs of a category
   */
  private async getAllDescendantIds(categoryId: string): Promise<string[]> {
    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    const descendantIds: string[] = [];

    for (const child of children) {
      descendantIds.push(child.id);
      const childDescendants = await this.getAllDescendantIds(child.id);
      descendantIds.push(...childDescendants);
    }

    return descendantIds;
  }
}
