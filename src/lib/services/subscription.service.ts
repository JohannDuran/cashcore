import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';
import { assertCategoryAccess, assertWalletOwnership } from './ownership';

/** Campos que jamás deben venir del payload del cliente */
const PROTECTED_SUBSCRIPTION_FIELDS = ['id', 'userId', 'createdAt', 'updatedAt', 'category', 'wallet', 'user'] as const;

function stripProtectedFields(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = { ...data };
  for (const field of PROTECTED_SUBSCRIPTION_FIELDS) {
    delete clean[field];
  }
  return clean;
}

export const subscriptionService = {
  async getSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: { category: true, wallet: true },
      orderBy: { nextBillDate: 'asc' },
    });
  },

  async createSubscription(userId: string, data: Record<string, unknown>) {
    const { categoryId, walletId, ...rest } = stripProtectedFields(data) as {
      categoryId: string;
      walletId?: string | null;
    } & Record<string, unknown>;

    return prisma.$transaction(async (tx) => {
      await assertCategoryAccess(tx, userId, categoryId);
      if (walletId) {
        await assertWalletOwnership(tx, userId, walletId);
      }

      return tx.subscription.create({
        data: {
          ...rest,
          user: { connect: { id: userId } },
          category: { connect: { id: categoryId } },
          ...(walletId && { wallet: { connect: { id: walletId } } }),
        } as Prisma.SubscriptionCreateInput,
      });
    });
  },

  async updateSubscription(userId: string, subscriptionId: string, data: Record<string, unknown>) {
    const { categoryId, walletId, ...rest } = stripProtectedFields(data) as {
      categoryId?: string;
      walletId?: string | null;
    } & Record<string, unknown>;

    return prisma.$transaction(async (tx) => {
      if (categoryId) {
        await assertCategoryAccess(tx, userId, categoryId);
      }
      if (walletId) {
        await assertWalletOwnership(tx, userId, walletId);
      }

      return tx.subscription.update({
        where: { id: subscriptionId, userId },
        data: {
          ...rest,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          // null = desconectar explícito; string = conectar; undefined = no tocar
          ...(walletId === null
            ? { wallet: { disconnect: true } }
            : walletId
              ? { wallet: { connect: { id: walletId } } }
              : {}),
        } as Prisma.SubscriptionUpdateInput,
      });
    });
  },

  async deleteSubscription(userId: string, subscriptionId: string) {
    return prisma.subscription.delete({
      where: { id: subscriptionId, userId },
    });
  }
};
