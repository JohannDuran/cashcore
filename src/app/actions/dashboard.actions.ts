"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

export async function getDashboardDataAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
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
        subscriptions
      }
    };
  } catch (error: any) {
    logger.error({ err: error }, "getDashboardDataAction failed");
    return { success: false, error: error.message };
  }
}
