"use server";

import { debtService } from "@/lib/services/debt.service";
import type { Debt } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Normaliza las llaves de la capa frontend hacia la estructura de Prisma
 */
function mapFrontendToDb(frontendDebt: Partial<Debt>) {
  const dbData: Record<string, unknown> = { ...frontendDebt };
  
  if (dbData.startDate && typeof dbData.startDate === 'string') {
    dbData.startDate = new Date(dbData.startDate);
  }
  if (dbData.endDate && typeof dbData.endDate === 'string') {
    dbData.endDate = new Date(dbData.endDate);
  }
  if (dbData.createdAt) {
    dbData.createdAt = new Date(dbData.createdAt);
  }
  if (dbData.updatedAt) {
    dbData.updatedAt = new Date(dbData.updatedAt);
  }

  return dbData;
}

export async function getDebtsAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const debts = await debtService.getDebts(user.id);
    return { success: true, data: debts };
  } catch (error) {
    logger.error({ err: error }, "getDebtsAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function createDebtAction(debt: Omit<Debt, "createdAt"> & { id?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(debt);
    const newDebt = await debtService.createDebt(user.id, dbData);

    return { success: true, data: newDebt };
  } catch (error) {
    logger.error({ err: error }, "createDebtAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateDebtAction(debtId: string, data: Partial<Debt>) {
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

    const updatedDebt = await debtService.updateDebt(user.id, debtId, dbData);

    return { success: true, data: updatedDebt };
  } catch (error) {
    logger.error({ err: error }, "updateDebtAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteDebtAction(debtId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await debtService.deleteDebt(user.id, debtId);
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "deleteDebtAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
