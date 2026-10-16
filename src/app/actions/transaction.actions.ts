"use server";

import { transactionService } from "@/lib/services/transaction.service";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Mapea los datos del Frontend al esquema de Prisma
 */
interface TransactionFormInput {
  id?: string;
  type: string;
  amount: number;
  currency: string;
  walletId?: string | null;
  debtId?: string | null;
  categoryId: string;
  description: string;
  note?: string | null;
  date: string | Date;
  isRecurring?: boolean;
  recurringRule?: { frequency?: string; interval?: number } | null;
  transferToWalletId?: string | null;
  transferToDebtId?: string | null;
  tagIds?: string[];
}

function mapFrontendToDb(data: TransactionFormInput) {
  return {
    id: data.id,
    type: data.type,
    amount: data.amount,
    currency: data.currency,
    walletId: data.walletId || null,
    debtId: data.debtId || null,
    categoryId: data.categoryId,
    description: data.description,
    note: data.note ?? null,
    date: new Date(data.date),
    isRecurring: data.isRecurring || false,
    recurringFrequency: data.recurringRule?.frequency || null,
    recurringInterval: data.recurringRule?.interval || null,
    transferToWalletId: data.transferToWalletId || null,
    transferToDebtId: data.transferToDebtId || null,
    tagIds: data.tagIds || [],
  };
}

export async function createTransactionAction(data: TransactionFormInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const userId = user.id;

    // 2. Mapear datos
    const dbData = mapFrontendToDb(data);

    // 3. Persistir en Supabase
    const tx = await transactionService.createTransaction(userId, dbData);

    // 4. Limpiar caché de Next.js para que las demás páginas vean los datos frescos
    revalidatePath("/");

    return { success: true, data: tx };
  } catch (error) {
    logger.error({ err: error }, "createTransactionAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateTransactionAction(transactionId: string, data: TransactionFormInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const userId = user.id;

    const dbData = mapFrontendToDb(data);

    const tx = await transactionService.updateTransaction(userId, transactionId, dbData);
    revalidatePath("/");

    return { success: true, data: tx };
  } catch (error) {
    logger.error({ err: error }, "updateTransactionAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteTransactionAction(transactionId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const userId = user.id;

    await transactionService.deleteTransaction(userId, transactionId);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "deleteTransactionAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
