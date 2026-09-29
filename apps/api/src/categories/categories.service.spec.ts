import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  const mockUser = { id: 'user-uuid-1', role: 'USER' };
  const mockOtherUser = { id: 'user-uuid-2', role: 'USER' };
  const mockAdmin = { id: 'admin-uuid-1', role: 'ADMIN' };

  const mockCategory = {
    id: 'category-uuid-1',
    name: 'Faculdade',
    color: '#10B981',
    ownerId: 'user-uuid-1',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { tasks: 2 },
  };

  beforeEach(() => {
    prisma = {
      taskCategory: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      task: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a category for the authenticated user with trimmed name and uppercase color', async () => {
      prisma.taskCategory.findFirst.mockResolvedValue(null);
      prisma.taskCategory.create.mockResolvedValue(mockCategory);

      const result = await service.create(mockUser.id, { name: '  Faculdade ', color: '#10b981' });

      expect(prisma.taskCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Faculdade', color: '#10B981', ownerId: mockUser.id },
        }),
      );
      expect(result.taskCount).toBe(2);
    });

    it('uses the default color when none is informed', async () => {
      prisma.taskCategory.findFirst.mockResolvedValue(null);
      prisma.taskCategory.create.mockResolvedValue(mockCategory);

      await service.create(mockUser.id, { name: 'Casa' });

      expect(prisma.taskCategory.create.mock.calls[0][0].data.color).toBe('#3B82F6');
    });

    it('rejects duplicated name (case-insensitive) for the same user', async () => {
      prisma.taskCategory.findFirst.mockResolvedValue(mockCategory);

      await expect(service.create(mockUser.id, { name: 'faculdade' })).rejects.toThrow(ConflictException);
      expect(prisma.taskCategory.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('restricts regular users to their own active categories', async () => {
      prisma.taskCategory.count.mockResolvedValue(1);
      prisma.taskCategory.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll(mockUser, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(prisma.taskCategory.findMany.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ deletedAt: null, ownerId: mockUser.id }),
      );
    });

    it('allows admin to list categories from all users', async () => {
      prisma.taskCategory.count.mockResolvedValue(1);
      prisma.taskCategory.findMany.mockResolvedValue([mockCategory]);

      await service.findAll(mockAdmin, { page: 1, pageSize: 20 });

      expect(prisma.taskCategory.findMany.mock.calls[0][0].where.ownerId).toBeUndefined();
    });
  });

  describe('ownership', () => {
    it('throws NotFoundException when category does not exist', async () => {
      prisma.taskCategory.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockUser, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for another regular user', async () => {
      prisma.taskCategory.findFirst.mockResolvedValue(mockCategory);

      await expect(service.update(mockOtherUser, mockCategory.id, { name: 'Outra' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('renames a category checking duplicates among the owner categories', async () => {
      prisma.taskCategory.findFirst
        .mockResolvedValueOnce(mockCategory) // categoria acessível
        .mockResolvedValueOnce(null); // nenhum nome duplicado
      prisma.taskCategory.update.mockResolvedValue({ ...mockCategory, name: 'Universidade' });

      const result = await service.update(mockUser, mockCategory.id, { name: 'Universidade' });

      expect(prisma.taskCategory.findFirst.mock.calls[1][0].where).toEqual(
        expect.objectContaining({ ownerId: mockCategory.ownerId, NOT: { id: mockCategory.id } }),
      );
      expect(result.name).toBe('Universidade');
    });

    it('does not check duplicates when only the letter case changes', async () => {
      prisma.taskCategory.findFirst.mockResolvedValueOnce(mockCategory);
      prisma.taskCategory.update.mockResolvedValue({ ...mockCategory, name: 'FACULDADE' });

      await service.update(mockUser, mockCategory.id, { name: 'FACULDADE' });

      expect(prisma.taskCategory.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove (Soft Delete)', () => {
    it('soft deletes the category and detaches its tasks in a transaction', async () => {
      prisma.taskCategory.findFirst.mockResolvedValue(mockCategory);

      await service.remove(mockUser, mockCategory.id);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategory.id },
        data: { categoryId: null },
      });
      expect(prisma.taskCategory.update).toHaveBeenCalledWith({
        where: { id: mockCategory.id },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
