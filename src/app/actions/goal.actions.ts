"use server";

import { goalService } from "@/lib/services/goal.service";
import type { Goal } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Normaliza las llaves de la capa frontend hacia la estructura de Prisma
 */
function mapFrontendToDb(frontendGoal: Partial<Goal>) {
  const dbData: Record<string, unknown> = { ...frontendGoal };

  if (dbData.deadline && (typeof dbData.deadline === 'string' || typeof dbData.deadline === 'number' || dbData.deadline instanceof Date)) {
    dbData.deadline = new Date(dbData.deadline);
  }
  if (dbData.createdAt && (typeof dbData.createdAt === 'string' || typeof dbData.createdAt === 'number' || dbData.createdAt instanceof Date)) {
    dbData.createdAt = new Date(dbData.createdAt);
  }
  if (dbData.updatedAt && (typeof dbData.updatedAt === 'string' || typeof dbData.updatedAt === 'number' || dbData.updatedAt instanceof Date)) {
    dbData.updatedAt = new Date(dbData.updatedAt);
  }

  // El userId real se deriva del token en cada action; se elimina del payload
  delete dbData.userId;

  return dbData;
}

export async function createGoalAction(
  goal: Omit<Goal, "createdAt" | "updatedAt" | "currentAmount" | "userId"> & { id?: string }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(goal);

    const newGoal = await goalService.createGoal(user.id, dbData);

    logger.info({ userId: user.id, goalId: newGoal.id }, "Meta creada");
    return { success: true, data: newGoal };
  } catch (error) {
    logger.error({ err: error }, "createGoalAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateGoalAction(goalId: string, data: Partial<Goal>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(data);

    const updatedGoal = await goalService.updateGoal(user.id, goalId, dbData);

    logger.info({ userId: user.id, goalId }, "Meta actualizada");
    return { success: true, data: updatedGoal };
  } catch (error) {
    logger.error({ err: error }, "updateGoalAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteGoalAction(goalId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await goalService.deleteGoal(user.id, goalId);
    logger.info({ userId: user.id, goalId }, "Meta borrada");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "deleteGoalAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
