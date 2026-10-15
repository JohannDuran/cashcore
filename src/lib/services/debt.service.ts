import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

/** Campos que jamás deben venir del payload del cliente */
const PROTECTED_DEBT_FIELDS = ['id', 'userId', 'createdAt', 'updatedAt'] as const;

function stripProtectedFields(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = { ...data };
  for (const field of PROTECTED_DEBT_FIELDS) {
    delete clean[field];
  }
  return clean;
}

export const debtService = {
  async getDebts(userId: string) {
    return prisma.debt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getDebtById(userId: string, debtId: string) {
    return prisma.debt.findFirst({
      where: { id: debtId, userId },
    });
  },

  async createDebt(userId: string, data: Record<string, unknown>) {
    return prisma.debt.create({
      data: {
        ...stripProtectedFields(data),
        userId,
      } as Prisma.DebtUncheckedCreateInput,
    });
  },

  async updateDebt(userId: string, debtId: string, data: Record<string, unknown>) {
    return prisma.debt.update({
      where: { id: debtId, userId },
      data: stripProtectedFields(data) as Prisma.DebtUncheckedUpdateInput,
    });
  },

  async deleteDebt(userId: string, debtId: string) {
    return prisma.debt.delete({
      where: { id: debtId, userId },
    });
  }
};
