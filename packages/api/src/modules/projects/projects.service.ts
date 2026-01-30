import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const code =
      createProjectDto.code ||
      `PRJ-${createProjectDto.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10)}-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        code,
        description: createProjectDto.description,
        startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined,
        endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined,
      },
    });
  }

  async findAll(active?: boolean) {
    const now = new Date();
    return this.prisma.project.findMany({
      where:
        active !== undefined
          ? active
            ? { startDate: { lte: now }, endDate: { gte: now } }
            : { OR: [{ startDate: { gt: now } }, { endDate: { lt: now } }] }
          : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        expenses: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
