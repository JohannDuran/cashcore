import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

export const categoryService = {
  async getCategories(userId: string) {
    return prisma.category.findMany({
      where: {
        OR: [
          { isDefault: true },
          { userId }
        ]
      },
      orderBy: { name: 'asc' },
    });
  },

  async createCustomCategory(userId: string, data: Record<string, unknown>) {
    return prisma.category.create({
      data: {
        ...data,
        userId,
        isDefault: false,
      } as Prisma.CategoryUncheckedCreateInput,
    });
  },

  async deleteCustomCategory(userId: string, categoryId: string) {
    // Solo puede eliminar si es suya (y no default)
    return prisma.category.delete({
      where: { id: categoryId, userId },
    });
  }
};
