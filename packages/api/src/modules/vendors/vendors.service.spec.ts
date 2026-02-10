import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('VendorsService', () => {
  let service: VendorsService;

  const mockPrismaService = {
    vendor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a vendor with normalized name', async () => {
      const dto = { name: '  Acme Corp  ', taxId: 'TAX-123' };
      const expectedVendor = {
        id: 'vendor-1',
        name: '  Acme Corp  ',
        normalizedName: 'acme corp',
        taxId: 'TAX-123',
      };
      mockPrismaService.vendor.create.mockResolvedValue(expectedVendor);

      const result = await service.create(dto);

      expect(result).toEqual(expectedVendor);
      expect(mockPrismaService.vendor.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          normalizedName: 'acme corp',
        },
      });
    });

    it('should lowercase and trim the name for normalizedName', async () => {
      const dto = { name: '  UPPER Case Name  ' };
      mockPrismaService.vendor.create.mockResolvedValue({ id: 'vendor-1' });

      await service.create(dto);

      expect(mockPrismaService.vendor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          normalizedName: 'upper case name',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all vendors ordered by name when no search provided', async () => {
      const vendors = [
        { id: 'v-1', name: 'Alpha' },
        { id: 'v-2', name: 'Beta' },
      ];
      mockPrismaService.vendor.findMany.mockResolvedValue(vendors);

      const result = await service.findAll();

      expect(result).toEqual(vendors);
      expect(mockPrismaService.vendor.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by name or taxId when search is provided', async () => {
      mockPrismaService.vendor.findMany.mockResolvedValue([]);

      await service.findAll('acme');

      expect(mockPrismaService.vendor.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'acme', mode: 'insensitive' } },
            { taxId: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no vendors match search', async () => {
      mockPrismaService.vendor.findMany.mockResolvedValue([]);

      const result = await service.findAll('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a vendor by id', async () => {
      const vendor = { id: 'vendor-1', name: 'Acme' };
      mockPrismaService.vendor.findUnique.mockResolvedValue(vendor);

      const result = await service.findOne('vendor-1');

      expect(result).toEqual(vendor);
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: 'vendor-1' },
      });
    });

    it('should throw NotFoundException when vendor does not exist', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Vendor with ID nonexistent not found',
      );
    });
  });

  describe('findOrCreateByName', () => {
    it('should return existing vendor when normalized name matches', async () => {
      const existingVendor = { id: 'vendor-1', name: 'Acme Corp', normalizedName: 'acme corp' };
      mockPrismaService.vendor.findFirst.mockResolvedValue(existingVendor);

      const result = await service.findOrCreateByName('  Acme Corp  ');

      expect(result).toEqual(existingVendor);
      expect(mockPrismaService.vendor.findFirst).toHaveBeenCalledWith({
        where: { normalizedName: 'acme corp' },
      });
      expect(mockPrismaService.vendor.create).not.toHaveBeenCalled();
    });

    it('should create new vendor when no existing vendor matches', async () => {
      const newVendor = { id: 'vendor-2', name: 'New Vendor', normalizedName: 'new vendor' };
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.create.mockResolvedValue(newVendor);

      const result = await service.findOrCreateByName('New Vendor');

      expect(result).toEqual(newVendor);
      expect(mockPrismaService.vendor.create).toHaveBeenCalledWith({
        data: { name: 'New Vendor', normalizedName: 'new vendor' },
      });
    });

    it('should be idempotent - return same vendor for same name with different casing', async () => {
      const existingVendor = { id: 'vendor-1', name: 'Acme', normalizedName: 'acme' };
      mockPrismaService.vendor.findFirst.mockResolvedValue(existingVendor);

      const result1 = await service.findOrCreateByName('ACME');
      const result2 = await service.findOrCreateByName('acme');

      expect(result1).toEqual(result2);
      expect(mockPrismaService.vendor.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing vendor', async () => {
      const existingVendor = { id: 'vendor-1', name: 'Acme' };
      const updatedVendor = { id: 'vendor-1', name: 'Acme Updated' };
      mockPrismaService.vendor.findUnique.mockResolvedValue(existingVendor);
      mockPrismaService.vendor.update.mockResolvedValue(updatedVendor);

      const result = await service.update('vendor-1', { name: 'Acme Updated' });

      expect(result).toEqual(updatedVendor);
      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendor-1' },
        data: { name: 'Acme Updated' },
      });
    });

    it('should throw NotFoundException when updating non-existent vendor', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an existing vendor', async () => {
      const vendor = { id: 'vendor-1', name: 'Acme' };
      mockPrismaService.vendor.findUnique.mockResolvedValue(vendor);
      mockPrismaService.vendor.delete.mockResolvedValue(vendor);

      const result = await service.remove('vendor-1');

      expect(result).toEqual(vendor);
      expect(mockPrismaService.vendor.delete).toHaveBeenCalledWith({
        where: { id: 'vendor-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent vendor', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
