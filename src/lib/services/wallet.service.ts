import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

export const walletService = {
  async getWallets(userId: string) {
    return prisma.wallet.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async getWalletById(userId: string, walletId: string) {
    return prisma.wallet.findUnique({
      where: { id: walletId, userId },
    });
  },

  async createWallet(userId: string, data: Record<string, unknown>) {
    return prisma.wallet.create({
      data: {
        ...data,
        userId,
      } as Prisma.WalletUncheckedCreateInput,
    });
  },

  async updateWallet(userId: string, walletId: string, data: Record<string, unknown>) {
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    return prisma.wallet.update({
      where: { id: walletId, userId },
      data: updateData as Prisma.WalletUncheckedUpdateInput,
    });
  },

  async deleteWallet(userId: string, walletId: string) {
    return prisma.wallet.delete({
      where: { id: walletId, userId },
    });
  }
};
