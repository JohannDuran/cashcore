import type { Budget, Subscription, BudgetPeriod } from "@/types";

export interface AppNotification {
  id: string;
  type: "subscription" | "budget";
  title: string;
  message: string;
  daysLeft: number;
  href: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function getNextResetDate(startDate: string, period: BudgetPeriod): Date {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let next = new Date(start);
  while (next <= today) {
    if (period === "weekly") next.setDate(next.getDate() + 7);
    else if (period === "biweekly") next.setDate(next.getDate() + 14);
    else if (period === "monthly") next.setMonth(next.getMonth() + 1);
    else if (period === "yearly") next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export function computeNotifications(
  subscriptions: Subscription[],
  budgets: Budget[],
  options: { subscriptionDays?: number; budgetLowPercentage?: number; budgetResetMinDays?: number } = {}
): AppNotification[] {
  const subscriptionDays = options.subscriptionDays ?? 5;
  const budgetLowPercentage = options.budgetLowPercentage ?? 90;
  const budgetResetMinDays = options.budgetResetMinDays ?? 7;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const notifications: AppNotification[] = [];

  for (const sub of subscriptions) {
    if (!sub.isActive || !sub.nextBillDate) continue;
    const billDate = new Date(sub.nextBillDate); billDate.setHours(0, 0, 0, 0);
    const daysLeft = daysBetween(today, billDate);
    if (daysLeft < 0 || daysLeft > subscriptionDays) continue;

    notifications.push({
      id: `sub-${sub.id}`,
      type: "subscription",
      title: daysLeft === 0 ? "Cobro hoy" : `Cobro en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`,
      message: `${sub.name} se cobrará ${daysLeft === 0 ? "hoy" : `el ${billDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`}`,
      daysLeft,
      href: "/subscriptions",
    });
  }

  for (const budget of budgets) {
    if (!budget.isActive) continue;
    const remaining = budget.amount - budget.spent;
    const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    if (percentage < budgetLowPercentage) continue;

    const resetDate = getNextResetDate(budget.startDate, budget.period);
    const daysToReset = daysBetween(today, resetDate);
    if (daysToReset <= budgetResetMinDays) continue;

    notifications.push({
      id: `budget-${budget.id}`,
      type: "budget",
      title: "Presupuesto ajustado",
      message: `A ${budget.name} le quedan ${remaining.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} y faltan ${daysToReset} días para reiniciarse`,
      daysLeft: daysToReset,
      href: "/budgets",
    });
  }

  return notifications.sort((a, b) => a.daysLeft - b.daysLeft);
}
