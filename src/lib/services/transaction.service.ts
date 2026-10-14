import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';
import { assertTransactionReferences } from './ownership';

type Tx = Prisma.TransactionClient;

interface TransactionEffectsInput {
  amount: number;
  type: string;
  walletId: string;
  transferToWalletId?: string | null;
}

/** Campos que jamás deben venir del payload del cliente */
const PROTECTED_TRANSACTION_FIELDS = [
  'id',
  'userId',
  'createdAt',
  'updatedAt',
  'category',
  'wallet',
  'tags',
  'user',
] as const;

function splitTransactionPayload(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = { ...data };
  for (const field of PROTECTED_TRANSACTION_FIELDS) {
    delete clean[field];
  }
  const tagIds = Array.isArray(data.tagIds) ? (data.tagIds as string[]) : [];
  return { clean, tagIds };
}

export const transactionService = {
  async getTransactions(userId: string, options?: { limit?: number; skip?: number; walletId?: string }) {
    const whereClause: Prisma.TransactionWhereInput = { userId };
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

  async createTransaction(userId: string, data: Record<string, unknown>) {
    const { clean, tagIds } = splitTransactionPayload(data);

    return prisma.$transaction(async (tx) => {
      await assertTransactionReferences(tx, userId, {
        walletId: clean.walletId as string,
        transferToWalletId: clean.transferToWalletId as string | null | undefined,
        categoryId: clean.categoryId as string,
        tagIds,
      });

      const transaction = await tx.transaction.create({
        data: {
          ...clean,
          userId,
          ...(tagIds.length ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
        },
      });

      await applyTransactionEffects(tx, userId, transaction);

      return transaction;
    });
  },

  async updateTransaction(userId: string, transactionId: string, data: Record<string, unknown>) {
    const { clean, tagIds } = splitTransactionPayload(data);
    const tagIdsProvided = data.tagIds !== undefined;

    return prisma.$transaction(async (tx) => {
      const oldTransaction = await tx.transaction.findFirstOrThrow({
        where: { id: transactionId, userId },
      });

      await assertTransactionReferences(tx, userId, {
        walletId: (clean.walletId as string) ?? oldTransaction.walletId,
        transferToWalletId:
          clean.transferToWalletId !== undefined
            ? (clean.transferToWalletId as string | null)
            : oldTransaction.transferToWalletId,
        categoryId: (clean.categoryId as string) ?? oldTransaction.categoryId,
        tagIds: tagIdsProvided ? tagIds : undefined,
      });

      await revertTransactionEffects(tx, userId, oldTransaction);

      const transaction = await tx.transaction.update({
        where: { id: transactionId, userId },
        data: {
          ...clean,
          ...(tagIdsProvided ? { tags: { set: tagIds.map((id) => ({ id })) } } : {}),
        },
      });

      await applyTransactionEffects(tx, userId, transaction);

      return transaction;
    });
  },

  async deleteTransaction(userId: string, transactionId: string) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirstOrThrow({
        where: { id: transactionId, userId },
      });

      await revertTransactionEffects(tx, userId, transaction);

      await tx.transaction.delete({
        where: { id: transactionId, userId },
      });

      return transaction;
    });
  }
};

/**
 * Aplica el impacto financiero de una transacción sobre las wallets del usuario.
 * El `where: { id, userId }` es defense-in-depth: aunque se omita una validación
 * previa, jamás se toca una wallet ajena (Prisma lanza P2025 si no coincide).
 */
async function applyTransactionEffects(
  tx: Tx,
  userId: string,
  transaction: TransactionEffectsInput
) {
  if (transaction.type === 'expense' || transaction.type === 'transfer') {
    await tx.wallet.update({
      where: { id: transaction.walletId, userId },
      data: { balance: { decrement: transaction.amount } },
    });
  } else if (transaction.type === 'income') {
    await tx.wallet.update({
      where: { id: transaction.walletId, userId },
      data: { balance: { increment: transaction.amount } },
    });
  }

  if (transaction.type === 'transfer' && transaction.transferToWalletId) {
    await tx.wallet.update({
      where: { id: transaction.transferToWalletId, userId },
      data: { balance: { increment: transaction.amount } },
    });
  }
}

/**
 * Revierte el impacto financiero de una transacción (update/delete).
 * Mismo scope por userId que applyTransactionEffects.
 */
async function revertTransactionEffects(
  tx: Tx,
  userId: string,
  transaction: TransactionEffectsInput
) {
  if (transaction.type === 'expense' || transaction.type === 'transfer') {
    await tx.wallet.update({
      where: { id: transaction.walletId, userId },
      data: { balance: { increment: transaction.amount } },
    });
  } else if (transaction.type === 'income') {
    await tx.wallet.update({
      where: { id: transaction.walletId, userId },
      data: { balance: { decrement: transaction.amount } },
    });
  }

  if (transaction.type === 'transfer' && transaction.transferToWalletId) {
    await tx.wallet.update({
      where: { id: transaction.transferToWalletId, userId },
      data: { balance: { decrement: transaction.amount } },
    });
  }
}
