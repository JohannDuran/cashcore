import { prisma } from '../prisma';

export const debtService = {
  async getDebts(userId: string) {
    return prisma.debt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getDebtById(userId: string, debtId: string) {
    return prisma.debt.findUnique({
      where: { id: debtId, userId },
    });
  },

  async createDebt(userId: string, data: any) {
    return prisma.debt.create({
      data: {
        ...data,
        userId,
      },
    });
  },

  async updateDebt(userId: string, debtId: string, data: any) {
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    return prisma.debt.update({
      where: { id: debtId, userId },
      data: updateData,
    });
  },

  async deleteDebt(userId: string, debtId: string) {
    return prisma.debt.delete({
      where: { id: debtId, userId },
    });
  }
};
