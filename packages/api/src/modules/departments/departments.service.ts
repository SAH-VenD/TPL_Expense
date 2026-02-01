import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from '@prisma/client';

export interface DepartmentTreeNode {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  children: DepartmentTreeNode[];
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    await this.validateUniqueName(dto.name);
    await this.validateUniqueCode(dto.code);

    if (dto.parentId) {
      await this.validateParentExists(dto.parentId);
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        parentId: dto.parentId,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return department;
  }

  async findAll(includeInactive = false): Promise<DepartmentTreeNode[]> {
    const departments = await this.prisma.department.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return this.buildTree(departments);
  }

  async findAllFlat(includeInactive = false) {
    const departments = await this.prisma.department.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        parentId: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description,
      isActive: dept.isActive,
      parentId: dept.parentId,
      userCount: dept._count.users,
    }));
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
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
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
            expenses: true,
            budgets: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    return {
      ...department,
      userCount: department._count.users,
      expenseCount: department._count.expenses,
      budgetCount: department._count.budgets,
    };
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const existing = await this.findExistingDepartment(id);

    await this.validateUpdateName(dto.name, existing);
    await this.validateUpdateCode(dto.code, existing);
    await this.validateUpdateParent(id, dto.parentId);

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code?.toUpperCase(),
        description: dto.description,
        parentId: dto.parentId,
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

    return updated;
  }

  async softDelete(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: {
              where: { status: { not: 'INACTIVE' } },
            },
            children: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    this.validateCanDeactivate(department);

    const updated = await this.prisma.department.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      },
    });

    return {
      message: `Department "${department.name}" has been deactivated`,
      department: updated,
    };
  }

  async reactivate(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    if (department.isActive) {
      throw new BadRequestException('Department is already active');
    }

    await this.validateCanReactivate(department);

    const updated = await this.prisma.department.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      },
    });

    return {
      message: `Department "${department.name}" has been reactivated`,
      department: updated,
    };
  }

  // ========== Private Validation Methods ==========

  private async findExistingDepartment(id: string): Promise<Department> {
    const existing = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    return existing;
  }

  private async validateUniqueName(name: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.department.findUnique({
      where: { name },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Department with name "${name}" already exists`);
    }
  }

  private async validateUniqueCode(code: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.department.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Department with code "${code}" already exists`);
    }
  }

  private async validateParentExists(parentId: string): Promise<void> {
    const parent = await this.prisma.department.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException(`Parent department with ID "${parentId}" not found`);
    }

    if (!parent.isActive) {
      throw new BadRequestException('Cannot set an inactive department as parent');
    }
  }

  private async validateUpdateName(name: string | undefined, existing: Department): Promise<void> {
    if (name && name !== existing.name) {
      await this.validateUniqueName(name, existing.id);
    }
  }

  private async validateUpdateCode(code: string | undefined, existing: Department): Promise<void> {
    if (code && code.toUpperCase() !== existing.code) {
      await this.validateUniqueCode(code, existing.id);
    }
  }

  private async validateUpdateParent(
    departmentId: string,
    parentId: string | undefined,
  ): Promise<void> {
    if (parentId === undefined) {
      return;
    }

    if (!parentId) {
      return; // Setting parent to null is allowed
    }

    if (parentId === departmentId) {
      throw new BadRequestException('A department cannot be its own parent');
    }

    await this.validateParentExists(parentId);

    const isCircular = await this.checkCircularReference(departmentId, parentId);
    if (isCircular) {
      throw new BadRequestException('Cannot set this parent: it would create a circular reference');
    }
  }

  private validateCanDeactivate(
    department: Department & { _count: { users: number; children: number } },
  ): void {
    if (!department.isActive) {
      throw new BadRequestException('Department is already inactive');
    }

    if (department._count.users > 0) {
      throw new BadRequestException(
        `Cannot deactivate department: ${department._count.users} active user(s) are still assigned to it`,
      );
    }

    if (department._count.children > 0) {
      throw new BadRequestException(
        `Cannot deactivate department: ${department._count.children} active child department(s) exist`,
      );
    }
  }

  private async validateCanReactivate(department: Department): Promise<void> {
    if (!department.parentId) {
      return;
    }

    const parent = await this.prisma.department.findUnique({
      where: { id: department.parentId },
    });

    if (parent && !parent.isActive) {
      throw new BadRequestException(
        'Cannot reactivate: parent department is inactive. Reactivate parent first.',
      );
    }
  }

  // ========== Private Helper Methods ==========

  private buildTree(
    departments: Array<{
      id: string;
      name: string;
      code: string;
      description: string | null;
      isActive: boolean;
      parentId: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { users: number };
    }>,
  ): DepartmentTreeNode[] {
    const departmentMap = new Map<string, DepartmentTreeNode>();

    // First pass: create all nodes
    for (const dept of departments) {
      departmentMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        isActive: dept.isActive,
        parentId: dept.parentId,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt,
        userCount: dept._count.users,
        children: [],
      });
    }

    // Second pass: build tree structure
    const rootNodes: DepartmentTreeNode[] = [];

    for (const dept of departments) {
      const node = departmentMap.get(dept.id)!;

      if (dept.parentId && departmentMap.has(dept.parentId)) {
        const parent = departmentMap.get(dept.parentId)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    this.sortTreeNodes(rootNodes);

    return rootNodes;
  }

  private sortTreeNodes(nodes: DepartmentTreeNode[]): void {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      if (node.children.length > 0) {
        this.sortTreeNodes(node.children);
      }
    }
  }

  private async checkCircularReference(
    departmentId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === departmentId) {
        return true;
      }

      if (visited.has(currentId)) {
        break;
      }

      visited.add(currentId);

      const current: { parentId: string | null } | null = await this.prisma.department.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = current?.parentId ?? null;
    }

    return false;
  }
}
