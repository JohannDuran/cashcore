import { prisma } from '../prisma';

export const transactionService = {
  async getTransactions(userId: string, options?: { limit?: number; skip?: number; walletId?: string }) {
    const whereClause: any = { userId };
    if (options?.walletId) whereClause.walletId = options.walletId;

    return prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        wallet: true,
        tags: true,
      },
      orderBy: { date: 'desc' },
      take: options?.limit,
      skip: options?.skip,
    });
  },

  async createTransaction(userId: string, data: any) {
    const { tagIds, ...rest } = data;

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          ...rest,
          userId,
          ...(tagIds?.length ? { tags: { connect: tagIds.map((id: string) => ({ id })) } } : {}),
        },
      });

      await applyTransactionEffects(tx, transaction);

      return transaction;
    });
  },

  async updateTransaction(userId: string, transactionId: string, data: any) {
    const { tagIds, ...rest } = data;

    return prisma.$transaction(async (tx) => {
      const oldTransaction = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId, userId },
      });

      await revertTransactionEffects(tx, oldTransaction);

      const transaction = await tx.transaction.update({
        where: { id: transactionId, userId },
        data: {
          ...rest,
          ...(tagIds !== undefined ? { tags: { set: tagIds.map((id: string) => ({ id })) } } : {}),
        },
      });

      await applyTransactionEffects(tx, transaction);

      return transaction;
    });
  },

  async deleteTransaction(userId: string, transactionId: string) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId, userId },
      });

      await revertTransactionEffects(tx, transaction);

      await tx.transaction.delete({
        where: { id: transactionId, userId },
      });

      return transaction;
    });
  }
};

async function applyTransactionEffects(
  tx: any,
  transaction: { amount: number; type: string; walletId: string; transferToWalletId?: string | null }
) {
  if (transaction.type === 'expense' || transaction.type === 'transfer') {
    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: { balance: { decrement: transaction.amount } },
    });
  } else if (transaction.type === 'income') {
    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: { balance: { increment: transaction.amount } },
    });
  }

  if (transaction.type === 'transfer' && transaction.transferToWalletId) {
    await tx.wallet.update({
      where: { id: transaction.transferToWalletId },
      data: { balance: { increment: transaction.amount } },
    });
  }
}

async function revertTransactionEffects(
  tx: any,
  transaction: { amount: number; type: string; walletId: string; transferToWalletId?: string | null }
) {
  if (transaction.type === 'expense' || transaction.type === 'transfer') {
    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: { balance: { increment: transaction.amount } },
    });
  } else if (transaction.type === 'income') {
    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: { balance: { decrement: transaction.amount } },
    });
  }

  if (transaction.type === 'transfer' && transaction.transferToWalletId) {
    await tx.wallet.update({
      where: { id: transaction.transferToWalletId },
      data: { balance: { decrement: transaction.amount } },
    });
  }
}
