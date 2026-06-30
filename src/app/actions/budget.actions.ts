"use server";

import { budgetService } from "@/lib/services/budget.service";
import type { Budget } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Normaliza las llaves de la capa frontend hacia la estructura de Prisma
 */
function mapFrontendToDb(frontendBudget: Partial<Budget>) {
  const dbData: any = { ...frontendBudget };

  delete dbData.id;
  delete dbData.category;
  delete dbData.user;

  if (dbData.startDate) {
    dbData.startDate = new Date(dbData.startDate);
  }
  if (dbData.endDate) {
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

export async function createBudgetAction(budget: Omit<Budget, "createdAt" | "updatedAt" | "spent"> & { id?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(budget);
    delete dbData.userId;

    const newBudget = await budgetService.createBudget(user.id, dbData);

    return { success: true, data: newBudget };
  } catch (error: any) {
    logger.error({ err: error }, "createBudgetAction failed");
    return { success: false, error: error.message };
  }
}

export async function updateBudgetAction(
  userId: string, // Kept for signature compatibility
  budgetId: string,
  data: Partial<Budget>
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(data);

    delete dbData.id;
    delete dbData.userId;

    const updatedBudget = await budgetService.updateBudget(
      user.id,
      budgetId,
      dbData
    );

    return { success: true, data: updatedBudget };
  } catch (error: any) {
    logger.error({ err: error }, "updateBudgetAction failed");
    return { success: false, error: error.message };
  }
}

export async function deleteBudgetAction(userId: string, budgetId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await budgetService.deleteBudget(user.id, budgetId);
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, "deleteBudgetAction failed");
    return { success: false, error: error.message };
  }
}
