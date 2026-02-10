import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project with provided code', async () => {
      const dto = { name: 'My Project', code: 'CUSTOM-CODE', description: 'Desc', startDate: '2026-01-01', endDate: '2026-12-31' };
      const expectedProject = { id: 'proj-1', ...dto };
      mockPrismaService.project.create.mockResolvedValue(expectedProject);

      const result = await service.create(dto);

      expect(result).toEqual(expectedProject);
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Project',
          code: 'CUSTOM-CODE',
          description: 'Desc',
        }),
      });
    });

    it('should auto-generate code when not provided', async () => {
      const dto = { name: 'Alpha Beta', startDate: '2026-01-01', endDate: '2026-12-31' };
      mockPrismaService.project.create.mockResolvedValue({ id: 'proj-1' });

      await service.create(dto);

      const createCall = mockPrismaService.project.create.mock.calls[0][0];
      expect(createCall.data.code).toMatch(/^PRJ-ALPHABETA-[A-Z0-9]+$/);
    });

    it('should strip non-alphanumeric chars from auto-generated code', async () => {
      const dto = { name: 'My Special-Project!', startDate: '2026-01-01', endDate: '2026-12-31' };
      mockPrismaService.project.create.mockResolvedValue({ id: 'proj-1' });

      await service.create(dto as any);

      const createCall = mockPrismaService.project.create.mock.calls[0][0];
      // The generated code should not contain spaces, hyphens from original name, or exclamation marks
      const codePart = createCall.data.code.split('-').slice(1, -1).join('-');
      expect(codePart).toMatch(/^[A-Z0-9]+$/);
    });

    it('should convert date strings to Date objects', async () => {
      const dto = {
        name: 'Dated Project',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
      mockPrismaService.project.create.mockResolvedValue({ id: 'proj-1' });

      await service.create(dto);

      const createCall = mockPrismaService.project.create.mock.calls[0][0];
      expect(createCall.data.startDate).toBeInstanceOf(Date);
      expect(createCall.data.endDate).toBeInstanceOf(Date);
    });

    it('should handle missing dates gracefully', async () => {
      const dto = { name: 'No Dates' } as any;
      mockPrismaService.project.create.mockResolvedValue({ id: 'proj-1' });

      await service.create(dto);

      const createCall = mockPrismaService.project.create.mock.calls[0][0];
      expect(createCall.data.startDate).toBeUndefined();
      expect(createCall.data.endDate).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all projects when active filter is not provided', async () => {
      const projects = [{ id: 'p-1', name: 'Project A' }];
      mockPrismaService.project.findMany.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(result).toEqual(projects);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });

    it('should filter active projects by date range when active=true', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);

      await service.findAll(true);

      const call = mockPrismaService.project.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('startDate');
      expect(call.where).toHaveProperty('endDate');
      expect(call.where.startDate).toEqual({ lte: expect.any(Date) });
      expect(call.where.endDate).toEqual({ gte: expect.any(Date) });
    });

    it('should filter inactive projects when active=false', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);

      await service.findAll(false);

      const call = mockPrismaService.project.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('OR');
      expect(call.where.OR).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a project with recent expenses', async () => {
      const project = {
        id: 'proj-1',
        name: 'Test Project',
        expenses: [{ id: 'exp-1' }, { id: 'exp-2' }],
      };
      mockPrismaService.project.findUnique.mockResolvedValue(project);

      const result = await service.findOne('proj-1');

      expect(result).toEqual(project);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        include: {
          expenses: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Project with ID nonexistent not found',
      );
    });
  });

  describe('update', () => {
    it('should update an existing project', async () => {
      const existingProject = { id: 'proj-1', name: 'Old Name', expenses: [] };
      const updatedProject = { id: 'proj-1', name: 'New Name' };
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.project.update.mockResolvedValue(updatedProject);

      const result = await service.update('proj-1', { name: 'New Name' });

      expect(result).toEqual(updatedProject);
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException when updating non-existent project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an existing project', async () => {
      const project = { id: 'proj-1', name: 'Test', expenses: [] };
      mockPrismaService.project.findUnique.mockResolvedValue(project);
      mockPrismaService.project.delete.mockResolvedValue(project);

      const result = await service.remove('proj-1');

      expect(result).toEqual(project);
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
