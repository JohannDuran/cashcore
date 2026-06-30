import { prisma } from '../prisma';

export const budgetService = {
  async getBudgets(userId: string) {
    return prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createBudget(userId: string, data: any) {
    return prisma.budget.create({
      data: {
        ...data,
        userId,
      },
    });
  },

  async updateBudget(userId: string, budgetId: string, data: any) {
    return prisma.budget.update({
      where: { id: budgetId, userId },
      data,
    });
  },

  async deleteBudget(userId: string, budgetId: string) {
    return prisma.budget.delete({
      where: { id: budgetId, userId },
    });
  }
};
