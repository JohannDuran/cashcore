"use server";

import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

export async function provisionNewUserAction(userId: string, email: string, name: string) {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) {
      return { success: true, message: "User already provisioned" };
    }

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        defaultCurrency: "MXN",
        preferredLocale: "es-MX",
        theme: "dark",
      },
    });

    // 2. Create 2 Wallets
    const wallet1 = await prisma.wallet.create({
      data: {
        userId,
        name: "Efectivo",
        type: "cash",
        currency: "MXN",
        balance: 1000.0,
        icon: "Banknote",
        color: "#22C55E",
        sortOrder: 0,
      },
    });

    const wallet2 = await prisma.wallet.create({
      data: {
        userId,
        name: "Cuenta Principal",
        type: "bank",
        currency: "MXN",
        balance: 5000.0,
        icon: "Building2",
        color: "#3B82F6",
        sortOrder: 1,
      },
    });

    // Categories are globally seeded, so we can just grab their IDs.
    const salaryCat = "cat-salario";
    const foodCat = "cat-supermercado";

    // 3. Create 2 Transactions
    await prisma.transaction.create({
      data: {
        userId,
        walletId: wallet2.id,
        type: "income",
        amount: 5000,
        currency: "MXN",
        categoryId: salaryCat,
        description: "Ingreso inicial de prueba",
        date: new Date(),
        isRecurring: false,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        walletId: wallet1.id,
        type: "expense",
        amount: -250,
        currency: "MXN",
        categoryId: foodCat,
        description: "Gasto de prueba",
        date: new Date(),
        isRecurring: false,
      },
    });

    // 4. Create 2 Budgets
    await prisma.budget.create({
      data: {
        userId,
        name: "Presupuesto Mensual",
        amount: 3000,
        spent: 250,
        period: "monthly",
        categoryIds: [foodCat],
        walletIds: [],
        startDate: new Date(),
        isActive: true,
      },
    });

    await prisma.budget.create({
      data: {
        userId,
        name: "Ahorro",
        amount: 1000,
        spent: 0,
        period: "monthly",
        categoryIds: ["cat-inversiones"],
        walletIds: [],
        startDate: new Date(),
        isActive: true,
      },
    });

    // 5. Create 1 Goal (Reporte)
    await prisma.goal.create({
      data: {
        userId,
        name: "Fondo de Emergencia",
        type: "emergency",
        targetAmount: 50000,
        currentAmount: 1000,
        icon: "ShieldAlert",
        color: "#F59E0B",
      },
    });

    // 6. Create 3 default Tags
    await prisma.tag.createMany({
      data: [
        { userId, name: "personal", color: "#22C55E" },
        { userId, name: "trabajo", color: "#3B82F6" },
        { userId, name: "urgente", color: "#EF4444" },
      ],
    });

    // 7. Create 2 Subscriptions
    await prisma.subscription.create({
      data: {
        userId,
        name: "Netflix",
        amount: 299,
        currency: "MXN",
        billingCycle: "monthly",
        categoryId: "cat-suscripciones",
        nextBillDate: new Date(new Date().setDate(new Date().getDate() + 15)), // 15 days from now
        icon: "Play",
        color: "#E50914",
      },
    });

    await prisma.subscription.create({
      data: {
        userId,
        name: "Spotify",
        amount: 129,
        currency: "MXN",
        billingCycle: "monthly",
        categoryId: "cat-suscripciones",
        nextBillDate: new Date(new Date().setDate(new Date().getDate() + 5)), // 5 days from now
        icon: "Music",
        color: "#1DB954",
      },
    });

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Provisioning error");
    return { success: false, error: "Failed to provision user" };
  }
}
