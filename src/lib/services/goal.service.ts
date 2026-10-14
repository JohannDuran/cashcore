import { prisma } from '../prisma';
import { assertWalletOwnership } from './ownership';

/** Campos que jamás deben venir del payload del cliente */
const PROTECTED_GOAL_FIELDS = ['id', 'userId', 'createdAt', 'updatedAt'] as const;

function stripProtectedFields(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = { ...data };
  for (const field of PROTECTED_GOAL_FIELDS) {
    delete clean[field];
  }
  return clean;
}

export const goalService = {
  async getGoals(userId: string) {
    return prisma.goal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' },
    });
  },

  async createGoal(userId: string, data: Record<string, unknown>) {
    const clean = stripProtectedFields(data);

    return prisma.$transaction(async (tx) => {
      if (clean.walletId) {
        await assertWalletOwnership(tx, userId, clean.walletId as string);
      }

      return tx.goal.create({
        data: {
          ...clean,
          userId,
        },
      });
    });
  },

  async updateGoal(userId: string, goalId: string, data: Record<string, unknown>) {
    const clean = stripProtectedFields(data);

    return prisma.$transaction(async (tx) => {
      if (clean.walletId) {
        await assertWalletOwnership(tx, userId, clean.walletId as string);
      }

      return tx.goal.update({
        where: { id: goalId, userId },
        data: clean,
      });
    });
  },

  async deleteGoal(userId: string, goalId: string) {
    return prisma.goal.delete({
      where: { id: goalId, userId },
    });
  }
};
