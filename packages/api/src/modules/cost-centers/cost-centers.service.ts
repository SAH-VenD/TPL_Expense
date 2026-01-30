import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  async create(createCostCenterDto: CreateCostCenterDto) {
    const code =
      createCostCenterDto.code ||
      `CC-${createCostCenterDto.name.toUpperCase().replaceAll(/\s+/g, '-').slice(0, 15)}`;
    return this.prisma.costCenter.create({
      data: {
        name: createCostCenterDto.name,
        code,
        description: createCostCenterDto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.costCenter.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const costCenter = await this.prisma.costCenter.findUnique({
      where: { id },
    });

    if (!costCenter) {
      throw new NotFoundException(`Cost Center with ID ${id} not found`);
    }

    return costCenter;
  }

  async update(id: string, updateCostCenterDto: UpdateCostCenterDto) {
    await this.findOne(id);

    return this.prisma.costCenter.update({
      where: { id },
      data: updateCostCenterDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.costCenter.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
