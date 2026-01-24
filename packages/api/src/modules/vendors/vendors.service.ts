import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const normalizedName = createVendorDto.name.toLowerCase().trim();
    return this.prisma.vendor.create({
      data: {
        ...createVendorDto,
        normalizedName,
      },
    });
  }

  async findAll(search?: string) {
    return this.prisma.vendor.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { taxId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async findOrCreateByName(name: string) {
    const normalizedName = name.toLowerCase().trim();
    let vendor = await this.prisma.vendor.findFirst({
      where: { normalizedName },
    });

    if (!vendor) {
      vendor = await this.prisma.vendor.create({
        data: { name, normalizedName },
      });
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    await this.findOne(id);

    return this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.vendor.delete({
      where: { id },
    });
  }
}
