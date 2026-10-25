"use server";

import { walletService } from "@/lib/services/wallet.service";
import type { Wallet } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Normaliza las llaves de la capa frontend hacia la estructura de Prisma
 */
function mapFrontendToDb(frontendWallet: Partial<Wallet>) {
  const dbData: Record<string, unknown> = { ...frontendWallet };
  
  if (dbData.createdAt && (typeof dbData.createdAt === 'string' || typeof dbData.createdAt === 'number' || dbData.createdAt instanceof Date)) {
    dbData.createdAt = new Date(dbData.createdAt);
  }
  if (dbData.updatedAt && (typeof dbData.updatedAt === 'string' || typeof dbData.updatedAt === 'number' || dbData.updatedAt instanceof Date)) {
    dbData.updatedAt = new Date(dbData.updatedAt);
  }

  return dbData;
}

export async function createWalletAction(wallet: Omit<Wallet, "createdAt"> & { id?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(wallet);

    // Si pasamos ID por optimistic UI, lo inyectamos al DB
    const newWallet = await walletService.createWallet(user.id, dbData);

    logger.info({ userId: user.id, walletId: newWallet.id }, "Wallet creada");
    return { success: true, data: newWallet };
  } catch (error) {
    logger.error({ err: error }, "createWalletAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateWalletAction(walletId: string, data: Partial<Wallet>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(data);

    // Evitamos enviar campos que Prisma no acepta en update directo
    delete dbData.id;
    delete dbData.userId;
    delete dbData.createdAt;
    delete dbData.updatedAt;

    const updatedWallet = await walletService.updateWallet(user.id, walletId, dbData);

    logger.info({ userId: user.id, walletId }, "Wallet actualizada");
    return { success: true, data: updatedWallet };
  } catch (error) {
    logger.error({ err: error }, "updateWalletAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteWalletAction(walletId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await walletService.deleteWallet(user.id, walletId);
    logger.info({ userId: user.id, walletId }, "Wallet borrada");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "deleteWalletAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
