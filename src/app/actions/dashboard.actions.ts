"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import { subscriptionService } from "@/lib/services/subscription.service";
import logger from "@/lib/logger";

export async function getDashboardDataAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Procesar domiciliaciones vencidas ANTES de leer los datos, para que las
    // transacciones generadas ya aparezcan en los datos frescos del dashboard.
    // Si algo falla aquí, no debe bloquear la carga del dashboard.
    try {
      const createdCount = await subscriptionService.processDueSubscriptions(user.id);
      if (createdCount > 0) {
        logger.info({ userId: user.id, createdCount }, "domiciled subscriptions processed");
      }
    } catch (subError) {
      logger.error({ err: subError, userId: user.id }, "processDueSubscriptions failed (non-blocking)");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: 'asc' },
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      include: {
        category: true,
        wallet: true,
        tags: true,
      }
    });

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
    });

    // We can fetch global or user categories
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: user.id },
          { isDefault: true }
        ]
      }
    });

    const tags = await prisma.tag.findMany({
      where: { userId: user.id }
    });

    const goals = await prisma.goal.findMany({
      where: { userId: user.id }
    });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        category: true,
      }
    });

    const debts = await prisma.debt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { 
      success: true, 
      data: {
        user: dbUser,
        wallets,
        transactions,
        budgets,
        categories,
        tags,
        goals,
        subscriptions,
        debts
      }
    };
  } catch (error) {
    logger.error({ err: error }, "getDashboardDataAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
