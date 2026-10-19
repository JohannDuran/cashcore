import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';
import { assertTransactionReferences, resolveAccountType } from './ownership';

type Tx = Prisma.TransactionClient;

interface TransactionEffectsInput {
  amount: number;
  type: string;
  walletId: string | null;
  debtId: string | null;
  transferToWalletId?: string | null;
  transferToDebtId?: string | null;
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
  'tagIds',
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
        debt: true,
        transferToWallet: true,
        transferToDebt: true,
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
      // El frontend envía walletId que puede ser un ID de Wallet o Debt
      // El origen puede venir como walletId (wallet o debt) o directamente como debtId
      const sourceId = (clean.walletId as string | null | undefined)
        ?? (clean.debtId as string | null | undefined)
        ?? null;
      // transferToWalletId puede contener un wallet o debt ID, o transferToDebtId puede tener el debt ID directamente
      const transferToId = (clean.transferToDebtId as string | null | undefined) 
        ?? (clean.transferToWalletId as string | null | undefined);
      
      await assertTransactionReferences(tx, userId, {
        walletId: sourceId,
        transferToWalletId: transferToId,
        categoryId: clean.categoryId as string,
        tagIds,
      });

      // Determinar el tipo de cuenta origen y destino
      let actualWalletId: string | null = null;
      let actualDebtId: string | null = null;
      let actualTransferToWalletId: string | null = null;
      let actualTransferToDebtId: string | null = null;

      if (sourceId) {
        const sourceAccount = await resolveAccountType(tx, userId, sourceId);
        if (sourceAccount?.type === 'wallet') {
          actualWalletId = sourceId;
        } else if (sourceAccount?.type === 'debt') {
          actualDebtId = sourceId;
        }
      }

      if (transferToId) {
        const destAccount = await resolveAccountType(tx, userId, transferToId);
        if (destAccount?.type === 'wallet') {
          actualTransferToWalletId = transferToId;
        } else if (destAccount?.type === 'debt') {
          actualTransferToDebtId = transferToId;
        }
      }

      // Preparar los datos para crear, removiendo los campos originales y agregando los correctos
      const createData = { ...clean };
      delete createData.walletId;
      delete createData.debtId;
      delete createData.transferToWalletId;

      const transaction = await tx.transaction.create({
        data: {
          ...createData,
          userId,
          walletId: actualWalletId,
          debtId: actualDebtId,
          transferToWalletId: actualTransferToWalletId,
          transferToDebtId: actualTransferToDebtId,
          ...(tagIds.length ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
        } as Prisma.TransactionUncheckedCreateInput,
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

      // El frontend envía el origen como walletId (wallet o debt) o directamente como debtId
      const sourceId = (clean.walletId as string | null | undefined)
        ?? (clean.debtId as string | null | undefined)
        ?? oldTransaction.walletId ?? oldTransaction.debtId;
      // transferToWalletId puede contener un wallet o debt ID, o transferToDebtId puede tener el debt ID directamente
      const transferToId = (clean.transferToDebtId as string | null | undefined) 
        ?? (clean.transferToWalletId !== undefined
          ? (clean.transferToWalletId as string | null)
          : oldTransaction.transferToWalletId ?? oldTransaction.transferToDebtId);

      await assertTransactionReferences(tx, userId, {
        walletId: sourceId,
        transferToWalletId: transferToId,
        categoryId: (clean.categoryId as string) ?? oldTransaction.categoryId,
        tagIds: tagIdsProvided ? tagIds : undefined,
      });

      await revertTransactionEffects(tx, userId, oldTransaction);

      // Determinar el tipo de cuenta origen y destino
      let actualWalletId: string | null = null;
      let actualDebtId: string | null = null;
      let actualTransferToWalletId: string | null = null;
      let actualTransferToDebtId: string | null = null;

      if (sourceId) {
        const sourceAccount = await resolveAccountType(tx, userId, sourceId);
        if (sourceAccount?.type === 'wallet') {
          actualWalletId = sourceId;
        } else if (sourceAccount?.type === 'debt') {
          actualDebtId = sourceId;
        }
      }

      if (transferToId) {
        const destAccount = await resolveAccountType(tx, userId, transferToId);
        if (destAccount?.type === 'wallet') {
          actualTransferToWalletId = transferToId;
        } else if (destAccount?.type === 'debt') {
          actualTransferToDebtId = transferToId;
        }
      }

      // Preparar los datos para actualizar
      const updateData = { ...clean };
      delete updateData.walletId;
      delete updateData.debtId;
      delete updateData.transferToWalletId;

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...updateData,
          walletId: actualWalletId,
          debtId: actualDebtId,
          transferToWalletId: actualTransferToWalletId,
          transferToDebtId: actualTransferToDebtId,
          ...(tagIdsProvided ? { tags: { set: tagIds.map((id) => ({ id })) } } : {}),
        } as Prisma.TransactionUncheckedUpdateInput,
      });

      await applyTransactionEffects(tx, userId, transaction);

      return transaction;
    });
  },

  async deleteTransaction(userId: string, transactionId: string) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId },
      });

      if (!transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      await revertTransactionEffects(tx, userId, transaction);

      // Prisma 6: delete where solo acepta campos únicos (PK). El ownership ya fue
      // validado por el findFirst anterior; aquí solo usamos el PK.
      await tx.transaction.delete({
        where: { id: transactionId },
      });

      return transaction;
    });
  }
};

/**
 * Aplica el impacto financiero de una transacción sobre las wallets/deudas del usuario.
 * El `where: { id, userId }` es defense-in-depth: aunque se omita una validación
 * previa, jamás se toca una wallet/deuda ajena (Prisma lanza P2025 si no coincide).
 */
async function applyTransactionEffects(
  tx: Tx,
  userId: string,
  transaction: TransactionEffectsInput
) {
  const { walletId, debtId, transferToWalletId, transferToDebtId, type, amount } = transaction;
  
  // Efectos en la cuenta origen (wallet o debt)
  if (type === 'expense' || type === 'transfer') {
    if (walletId) {
      // Origen es wallet: decrementar balance
      await tx.wallet.update({
        where: { id: walletId, userId },
        data: { balance: { decrement: amount } },
      });
    } else if (debtId) {
      // Origen es deuda (tarjeta de crédito): incrementar saldo adeudado
      await tx.debt.update({
        where: { id: debtId, userId },
        data: { currentBalance: { increment: amount } },
      });
    }
  } else if (type === 'income') {
    if (walletId) {
      // Ingreso a wallet: incrementar balance
      await tx.wallet.update({
        where: { id: walletId, userId },
        data: { balance: { increment: amount } },
      });
    } else if (debtId) {
      // Ingreso a deuda: decrementar saldo adeudado (pago)
      await tx.debt.update({
        where: { id: debtId, userId },
        data: { currentBalance: { decrement: amount } },
      });
    }
  }

  // Efectos en la cuenta destino (solo para transferencias)
  if (type === 'transfer') {
    if (transferToWalletId) {
      // Destino es wallet: incrementar balance
      await tx.wallet.update({
        where: { id: transferToWalletId, userId },
        data: { balance: { increment: amount } },
      });
    } else if (transferToDebtId) {
      // Destino es deuda: decrementar saldo adeudado (pago de deuda)
      await tx.debt.update({
        where: { id: transferToDebtId, userId },
        data: { currentBalance: { decrement: amount } },
      });
    }
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
  const { walletId, debtId, transferToWalletId, transferToDebtId, type, amount } = transaction;

  // Revertir efectos en la cuenta origen
  if (type === 'expense' || type === 'transfer') {
    if (walletId) {
      // Revertir decremento en wallet: incrementar
      await tx.wallet.update({
        where: { id: walletId, userId },
        data: { balance: { increment: amount } },
      });
    } else if (debtId) {
      // Revertir incremento en deuda: decrementar
      await tx.debt.update({
        where: { id: debtId, userId },
        data: { currentBalance: { decrement: amount } },
      });
    }
  } else if (type === 'income') {
    if (walletId) {
      // Revertir incremento en wallet: decrementar
      await tx.wallet.update({
        where: { id: walletId, userId },
        data: { balance: { decrement: amount } },
      });
    } else if (debtId) {
      // Revertir decremento en deuda: incrementar
      await tx.debt.update({
        where: { id: debtId, userId },
        data: { currentBalance: { increment: amount } },
      });
    }
  }

  // Revertir efectos en la cuenta destino (solo para transferencias)
  if (type === 'transfer') {
    if (transferToWalletId) {
      // Revertir incremento en wallet destino: decrementar
      await tx.wallet.update({
        where: { id: transferToWalletId, userId },
        data: { balance: { decrement: amount } },
      });
    } else if (transferToDebtId) {
      // Revertir decremento en deuda destino: incrementar
      await tx.debt.update({
        where: { id: transferToDebtId, userId },
        data: { currentBalance: { increment: amount } },
      });
    }
  }
}
