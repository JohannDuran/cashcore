"use server";

import { subscriptionService } from "@/lib/services/subscription.service";
import type { Subscription } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Normaliza las llaves de la capa frontend hacia la estructura de Prisma
 */
function mapFrontendToDb(frontendSub: Partial<Subscription>) {
  const dbData: Record<string, unknown> = { ...frontendSub };

  if (dbData.nextBillDate && (typeof dbData.nextBillDate === 'string' || typeof dbData.nextBillDate === 'number' || dbData.nextBillDate instanceof Date)) {
    dbData.nextBillDate = new Date(dbData.nextBillDate);
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

export async function createSubscriptionAction(
  sub: Omit<Subscription, "createdAt" | "updatedAt" | "userId"> & { id?: string }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(sub);

    const newSub = await subscriptionService.createSubscription(user.id, dbData);

    return { success: true, data: newSub };
  } catch (error) {
    logger.error({ err: error }, "createSubscriptionAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateSubscriptionAction(subId: string, data: Partial<Subscription>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbData = mapFrontendToDb(data);

    const updatedSub = await subscriptionService.updateSubscription(user.id, subId, dbData);

    return { success: true, data: updatedSub };
  } catch (error) {
    logger.error({ err: error }, "updateSubscriptionAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteSubscriptionAction(subId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await subscriptionService.deleteSubscription(user.id, subId);
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "deleteSubscriptionAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
