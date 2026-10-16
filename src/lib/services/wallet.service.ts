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
    // Antes de borrar la wallet, preservamos su nombre en las transacciones que la
    // referencian (como origen o como destino). Así el historial se conserva (gracias
    // a onDelete: SetNull) y la UI puede seguir mostrando el nombre en vez de "?".
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId, userId },
      select: { name: true },
    });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return prisma.$transaction(async (tx) => {
      // Transacciones donde esta wallet es el ORIGEN
      await tx.transaction.updateMany({
        where: { userId, walletId },
        data: { walletName: wallet.name },
      });
      // Transacciones donde esta wallet es el DESTINO de una transferencia
      await tx.transaction.updateMany({
        where: { userId, transferToWalletId: walletId },
        data: { transferToWalletName: wallet.name },
      });
      // Al borrar, onDelete: SetNull deja walletId/transferToWalletId en null
      // pero conserva la transacción y el nombre ya guardado.
      return tx.wallet.delete({
        where: { id: walletId, userId },
      });
    });
  }
};
