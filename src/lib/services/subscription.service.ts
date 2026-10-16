import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';
import { assertCategoryAccess, assertWalletOwnership, assertDebtOwnership } from './ownership';

/** Campos que jamás deben venir del payload del cliente */
const PROTECTED_SUBSCRIPTION_FIELDS = ['id', 'userId', 'createdAt', 'updatedAt', 'category', 'wallet', 'user'] as const;

function stripProtectedFields(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = { ...data };
  for (const field of PROTECTED_SUBSCRIPTION_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/**
 * Avanza una fecha según el ciclo de facturación.
 * Trabaja con componentes UTC porque nextBillDate es @db.Date (medianoche UTC).
 */
function advanceByCycle(date: Date, cycle: string): Date {
  const d = new Date(date);
  switch (cycle) {
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    case 'monthly':
    default:
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
  }
  return d;
}

/** Devuelve "hoy" a medianoche UTC, para comparar contra nextBillDate (@db.Date). */
function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const subscriptionService = {
  async getSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: { category: true, wallet: true },
      orderBy: { nextBillDate: 'asc' },
    });
  },

  /**
   * Procesa las suscripciones DOMICILIADAS cuya fecha de cobro ya llegó (o pasó).
   * Por cada ciclo vencido crea una transacción de gasto desde la cuenta configurada
   * (wallet o deuda), aplica el efecto en el balance y avanza nextBillDate al siguiente
   * ciclo. Avanzar la fecha garantiza idempotencia: aunque la app se abra varias veces
   * el mismo día, el cobro no se duplica.
   *
   * Reglas:
   * - Solo isActive && isDomiciliado.
   * - Si no tiene cuenta (walletId ni debtId), se omite (no se puede cobrar).
   * - Se cobra aunque el balance quede negativo (como una domiciliación real).
   * - Tope de seguridad de ciclos por suscripción para evitar bucles si la fecha
   *   quedó muy atrasada o mal configurada.
   *
   * @returns número de transacciones creadas.
   */
  async processDueSubscriptions(userId: string): Promise<number> {
    const MAX_CYCLES_PER_SUB = 60; // tope defensivo
    const today = todayUtcMidnight();

    const dueSubs = await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
        isDomiciliado: true,
        nextBillDate: { lte: today },
      },
    });

    if (dueSubs.length === 0) return 0;

    let created = 0;

    for (const sub of dueSubs) {
      // Sin cuenta configurada no se puede generar el cargo
      if (!sub.walletId && !sub.debtId) continue;

      await prisma.$transaction(async (tx) => {
        let billDate = new Date(sub.nextBillDate);
        let cycles = 0;

        while (billDate.getTime() <= today.getTime() && cycles < MAX_CYCLES_PER_SUB) {
          // Crear la transacción de gasto para este ciclo
          await tx.transaction.create({
            data: {
              userId,
              type: 'expense',
              amount: sub.amount,
              currency: sub.currency,
              categoryId: sub.categoryId,
              description: `Suscripción: ${sub.name}`,
              date: billDate,
              walletId: sub.walletId ?? null,
              debtId: sub.walletId ? null : (sub.debtId ?? null),
              isRecurring: false,
            } as Prisma.TransactionUncheckedCreateInput,
          });

          // Aplicar el efecto financiero en la cuenta configurada
          if (sub.walletId) {
            await tx.wallet.update({
              where: { id: sub.walletId, userId },
              data: { balance: { decrement: sub.amount } },
            });
          } else if (sub.debtId) {
            await tx.debt.update({
              where: { id: sub.debtId, userId },
              data: { currentBalance: { increment: sub.amount } },
            });
          }

          created++;
          cycles++;
          billDate = advanceByCycle(billDate, sub.billingCycle);
        }

        // Persistir la nueva próxima fecha de cobro
        await tx.subscription.update({
          where: { id: sub.id, userId },
          data: { nextBillDate: billDate },
        });
      });
    }

    return created;
  },

  async createSubscription(userId: string, data: Record<string, unknown>) {
    const { categoryId, walletId, debtId, ...rest } = stripProtectedFields(data) as {
      categoryId: string;
      walletId?: string | null;
      debtId?: string | null;
    } & Record<string, unknown>;

    return prisma.$transaction(async (tx) => {
      await assertCategoryAccess(tx, userId, categoryId);
      if (walletId) {
        await assertWalletOwnership(tx, userId, walletId);
      }
      if (debtId) {
        await assertDebtOwnership(tx, userId, debtId);
      }

      return tx.subscription.create({
        data: {
          ...rest,
          user: { connect: { id: userId } },
          category: { connect: { id: categoryId } },
          // La cuenta de cargo puede ser una wallet O una deuda (tarjeta), nunca ambas.
          ...(walletId && { wallet: { connect: { id: walletId } } }),
          ...(debtId && { debt: { connect: { id: debtId } } }),
        } as Prisma.SubscriptionCreateInput,
      });
    });
  },

  async updateSubscription(userId: string, subscriptionId: string, data: Record<string, unknown>) {
    const { categoryId, walletId, debtId, ...rest } = stripProtectedFields(data) as {
      categoryId?: string;
      walletId?: string | null;
      debtId?: string | null;
    } & Record<string, unknown>;

    return prisma.$transaction(async (tx) => {
      if (categoryId) {
        await assertCategoryAccess(tx, userId, categoryId);
      }
      if (walletId) {
        await assertWalletOwnership(tx, userId, walletId);
      }
      if (debtId) {
        await assertDebtOwnership(tx, userId, debtId);
      }

      return tx.subscription.update({
        where: { id: subscriptionId, userId },
        data: {
          ...rest,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          // Cuenta de cargo wallet: null = desconectar; string = conectar; undefined = no tocar
          ...(walletId === null
            ? { wallet: { disconnect: true } }
            : walletId
              ? { wallet: { connect: { id: walletId } } }
              : {}),
          // Cuenta de cargo deuda (tarjeta): misma semántica
          ...(debtId === null
            ? { debt: { disconnect: true } }
            : debtId
              ? { debt: { connect: { id: debtId } } }
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
