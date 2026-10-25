"use server";

import { debtService } from "@/lib/services/debt.service";
import type { Debt } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

/**
 * Convierte un valor a Date válido, o retorna null si es inválido/vacío.
 * Para fechas tipo @db.Date (solo fecha, sin hora), agrega hora de mediodía
 * para evitar desfases por zona horaria al guardar en UTC.
 */
function toValidDate(value: unknown): Date | null {
  if (!value) return null;
  
  // Si ya es Date, verificar validez
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  // Si es string, intentar parsear
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Si es formato YYYY-MM-DD, parsear como fecha local a mediodía
    // para evitar desfase de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
    
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Si es número (timestamp)
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * Normaliza las llaves de la capa frontend hacia la estructura de Prisma
 */
function mapFrontendToDb(frontendDebt: Partial<Debt>) {
  const dbData: Record<string, unknown> = { ...frontendDebt };
  
  // Convertir fechas con validación
  if ('startDate' in dbData) {
    dbData.startDate = toValidDate(dbData.startDate);
  }
  
  if ('endDate' in dbData) {
    const endDate = toValidDate(dbData.endDate);
    // Si endDate es null o inválido, establecer como null (campo opcional)
    dbData.endDate = endDate;
  }
  
  if ('nextPaymentDate' in dbData) {
    const nextPaymentDate = toValidDate(dbData.nextPaymentDate);
    // Si nextPaymentDate es null o inválido, establecer como null (campo opcional)
    dbData.nextPaymentDate = nextPaymentDate;
  }

  if ('statementPaidUntil' in dbData) {
    dbData.statementPaidUntil = toValidDate(dbData.statementPaidUntil);
  }

  if ('accruedOverrideDate' in dbData) {
    dbData.accruedOverrideDate = toValidDate(dbData.accruedOverrideDate);
  }
  
  if ('createdAt' in dbData) {
    dbData.createdAt = toValidDate(dbData.createdAt);
  }
  
  if ('updatedAt' in dbData) {
    dbData.updatedAt = toValidDate(dbData.updatedAt);
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

    logger.info({ userId: user.id, debtId: newDebt.id }, "Deuda creada");
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

    // startDate es obligatorio en el esquema: nunca enviar null en un update.
    // Si viene vacío/invalido, se omite para conservar el valor existente.
    if ('startDate' in dbData && dbData.startDate == null) {
      delete dbData.startDate;
    }

    const updatedDebt = await debtService.updateDebt(user.id, debtId, dbData);

    logger.info({ userId: user.id, debtId }, "Deuda actualizada");
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
    logger.info({ userId: user.id, debtId }, "Deuda borrada");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "deleteDebtAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
