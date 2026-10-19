import type { 
  AppNotification, 
  NotificationPreferences, 
  NotificationPriority,
  ComputeNotificationsInput,
  NotificationType
} from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_ICONS } from "@/types/notifications";
import type { BudgetPeriod } from "@/types";

// ──────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────

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

function getDaysPriority(days: number): NotificationPriority {
  if (days <= 1) return "critical";
  if (days <= 3) return "high";
  if (days <= 7) return "medium";
  return "low";
}

function getPercentagePriority(value: number, isHighBad: boolean): NotificationPriority {
  if (isHighBad) {
    // Para presupuestos: mayor % usado = más urgente
    if (value >= 95) return "critical";
    if (value >= 90) return "high";
    if (value >= 85) return "medium";
    return "low";
  } else {
    // Para deudas (% restante): menor % = más urgente
    if (value <= 5) return "critical";
    if (value <= 10) return "high";
    if (value <= 15) return "medium";
    return "low";
  }
}

function formatCurrency(amount: number, currency: string = "MXN"): string {
  return amount.toLocaleString("es-MX", { style: "currency", currency });
}

// ──────────────────────────────────────────────
// SUBSCRIPTION NOTIFICATIONS
// ──────────────────────────────────────────────

function computeSubscriptionNotifications(
  subscriptions: ComputeNotificationsInput["subscriptions"],
  prefs: NotificationPreferences["subscriptions"]
): AppNotification[] {
  if (!prefs.enabled || prefs.daysBefore.length === 0) return [];

  const notifications: AppNotification[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDays = Math.max(...prefs.daysBefore);

  for (const sub of subscriptions) {
    const billDate = new Date(sub.nextBillDate); billDate.setHours(0, 0, 0, 0);
    const daysLeft = daysBetween(today, billDate);
    
    if (daysLeft < 0 || daysLeft > maxDays) continue;

    // Verificar si debemos notificar (días restantes <= algún umbral configurado)
    const shouldNotify = prefs.daysBefore.some(d => daysLeft <= d);
    if (!shouldNotify) continue;

    const formattedDate = billDate.toLocaleDateString("es-MX", { 
      day: "numeric", 
      month: "short" 
    });

    notifications.push({
      id: `sub-${sub.id}`,
      type: "subscription_due",
      title: daysLeft === 0 
        ? "Cobro hoy" 
        : `Cobro en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`,
      message: `${sub.name} se cobrará ${daysLeft === 0 ? "hoy" : `el ${formattedDate}`} (${formatCurrency(sub.amount, sub.currency)})`,
      icon: NOTIFICATION_ICONS.subscription_due,
      priority: getDaysPriority(daysLeft),
      value: daysLeft,
      relatedId: sub.id,
      relatedName: sub.name,
      createdAt: new Date(),
    });
  }

  return notifications;
}

// ──────────────────────────────────────────────
// GOAL AMOUNT NOTIFICATIONS
// ──────────────────────────────────────────────

function computeGoalAmountNotifications(
  goals: ComputeNotificationsInput["goals"],
  prefs: NotificationPreferences["goalAmount"]
): AppNotification[] {
  if (!prefs.enabled || prefs.percentRemaining.length === 0) return [];

  const notifications: AppNotification[] = [];
  const maxPercent = Math.max(...prefs.percentRemaining);

  for (const goal of goals) {
    if (goal.targetAmount <= 0) continue;

    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) continue; // Meta ya completada

    const percentRemaining = (remaining / goal.targetAmount) * 100;

    // Solo notificar si el % restante es menor o igual al umbral más alto configurado
    if (percentRemaining > maxPercent) continue;

    // Encontrar el umbral que coincide (el más bajo que sea >= percentRemaining)
    const matchedThreshold = [...prefs.percentRemaining]
      .sort((a, b) => a - b)
      .find(p => percentRemaining <= p);
    
    if (!matchedThreshold) continue;

    notifications.push({
      id: `goal-amount-${goal.id}`,
      type: "goal_amount",
      title: "¡Casi alcanzas tu meta!",
      message: `A "${goal.name}" le faltan solo ${formatCurrency(remaining)} (${percentRemaining.toFixed(1)}%)`,
      icon: goal.icon || NOTIFICATION_ICONS.goal_amount,
      priority: getPercentagePriority(percentRemaining, false),
      value: percentRemaining,
      relatedId: goal.id,
      relatedName: goal.name,
      createdAt: new Date(),
    });
  }

  return notifications;
}

// ──────────────────────────────────────────────
// GOAL DEADLINE NOTIFICATIONS
// ──────────────────────────────────────────────

function computeGoalDeadlineNotifications(
  goals: ComputeNotificationsInput["goals"],
  prefs: NotificationPreferences["goalDeadline"]
): AppNotification[] {
  if (!prefs.enabled || prefs.daysBefore.length === 0) return [];

  const notifications: AppNotification[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDays = Math.max(...prefs.daysBefore);

  for (const goal of goals) {
    if (!goal.deadline) continue;
    if (goal.currentAmount >= goal.targetAmount) continue; // Ya completada

    const deadline = new Date(goal.deadline); deadline.setHours(0, 0, 0, 0);
    const daysLeft = daysBetween(today, deadline);

    if (daysLeft < 0 || daysLeft > maxDays) continue;

    const shouldNotify = prefs.daysBefore.some(d => daysLeft <= d);
    if (!shouldNotify) continue;

    const progress = goal.targetAmount > 0 
      ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(0) 
      : "0";

    notifications.push({
      id: `goal-deadline-${goal.id}`,
      type: "goal_deadline",
      title: daysLeft === 0 
        ? "¡Hoy vence tu meta!" 
        : "Meta por vencer",
      message: `"${goal.name}" vence en ${daysLeft} día${daysLeft === 1 ? "" : "s"} (${progress}% completada)`,
      icon: goal.icon || NOTIFICATION_ICONS.goal_deadline,
      priority: getDaysPriority(daysLeft),
      value: daysLeft,
      relatedId: goal.id,
      relatedName: goal.name,
      createdAt: new Date(),
    });
  }

  return notifications;
}

// ──────────────────────────────────────────────
// BUDGET NOTIFICATIONS
// ──────────────────────────────────────────────

function computeBudgetNotifications(
  budgets: ComputeNotificationsInput["budgets"],
  prefs: NotificationPreferences["budgets"]
): AppNotification[] {
  if (!prefs.enabled || prefs.percentUsed.length === 0) return [];

  const notifications: AppNotification[] = [];
  const minPercent = Math.min(...prefs.percentUsed);

  for (const budget of budgets) {
    if (budget.amount <= 0) continue;

    const usedPercent = (budget.spent / budget.amount) * 100;
    if (usedPercent < minPercent) continue;

    // Encontrar el umbral más alto alcanzado
    const matchedThreshold = [...prefs.percentUsed]
      .sort((a, b) => b - a)
      .find(p => usedPercent >= p);
    
    if (!matchedThreshold) continue;

    const remaining = Math.max(0, budget.amount - budget.spent);

    notifications.push({
      id: `budget-${budget.id}`,
      type: "budget_alert",
      title: usedPercent >= 100 
        ? "Presupuesto agotado" 
        : `${matchedThreshold}% utilizado`,
      message: `"${budget.name}": ${remaining > 0 ? `quedan ${formatCurrency(remaining)}` : "presupuesto agotado"}`,
      icon: NOTIFICATION_ICONS.budget_alert,
      priority: getPercentagePriority(usedPercent, true),
      value: usedPercent,
      relatedId: budget.id,
      relatedName: budget.name,
      createdAt: new Date(),
    });
  }

  return notifications;
}

// ──────────────────────────────────────────────
// DEBT MILESTONE NOTIFICATIONS (% pagado)
// ──────────────────────────────────────────────

function computeDebtMilestoneNotifications(
  debts: ComputeNotificationsInput["debts"],
  prefs: NotificationPreferences["debtMilestone"]
): AppNotification[] {
  if (!prefs.enabled || prefs.percentPaid.length === 0) return [];

  const notifications: AppNotification[] = [];
  const minPercent = Math.min(...prefs.percentPaid);

  for (const debt of debts) {
    if (debt.originalAmount <= 0) continue;

    const paidAmount = debt.originalAmount - debt.currentBalance;
    const paidPercent = (paidAmount / debt.originalAmount) * 100;
    
    if (paidPercent < minPercent) continue;

    // Encontrar el umbral más alto alcanzado
    const matchedThreshold = [...prefs.percentPaid]
      .sort((a, b) => b - a)
      .find(p => paidPercent >= p);
    
    if (!matchedThreshold) continue;

    notifications.push({
      id: `debt-milestone-${debt.id}`,
      type: "debt_milestone",
      title: paidPercent >= 100 
        ? "¡Deuda liquidada!" 
        : `¡${matchedThreshold}% pagado!`,
      message: `"${debt.name}": ${debt.currentBalance > 0 ? `solo faltan ${formatCurrency(debt.currentBalance)}` : "¡completamente pagada!"}`,
      icon: debt.icon || NOTIFICATION_ICONS.debt_milestone,
      priority: paidPercent >= 95 ? "critical" : paidPercent >= 75 ? "high" : "medium",
      value: paidPercent,
      relatedId: debt.id,
      relatedName: debt.name,
      createdAt: new Date(),
    });
  }

  return notifications;
}

// ──────────────────────────────────────────────
// DEBT BALANCE NOTIFICATIONS (% restante bajo)
// ──────────────────────────────────────────────

function computeDebtBalanceNotifications(
  debts: ComputeNotificationsInput["debts"],
  prefs: NotificationPreferences["debtBalance"]
): AppNotification[] {
  if (!prefs.enabled || prefs.percentRemaining.length === 0) return [];

  const notifications: AppNotification[] = [];
  const maxPercent = Math.max(...prefs.percentRemaining);

  for (const debt of debts) {
    if (debt.originalAmount <= 0 || debt.currentBalance <= 0) continue;

    const balancePercent = (debt.currentBalance / debt.originalAmount) * 100;
    
    if (balancePercent > maxPercent) continue;

    // Encontrar el umbral más bajo alcanzado
    const matchedThreshold = [...prefs.percentRemaining]
      .sort((a, b) => a - b)
      .find(p => balancePercent <= p);
    
    if (!matchedThreshold) continue;

    const paidPercent = 100 - balancePercent;

    notifications.push({
      id: `debt-balance-${debt.id}`,
      type: "debt_balance",
      title: `Saldo bajo: ${balancePercent.toFixed(0)}%`,
      message: `"${debt.name}": solo debes ${formatCurrency(debt.currentBalance)} (${paidPercent.toFixed(0)}% liquidado)`,
      icon: debt.icon || NOTIFICATION_ICONS.debt_balance,
      priority: getPercentagePriority(balancePercent, false),
      value: balancePercent,
      relatedId: debt.id,
      relatedName: debt.name,
      createdAt: new Date(),
    });
  }

  return notifications;
}

// ──────────────────────────────────────────────
// QUIET HOURS CHECK
// ──────────────────────────────────────────────

function isInQuietHours(quietHours: NotificationPreferences["quietHours"]): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = quietHours.start.split(":").map(Number);
  const [endHour, endMin] = quietHours.end.split(":").map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Si el horario cruza la medianoche (ej: 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }
  
  return currentTime >= startTime && currentTime < endTime;
}

// ──────────────────────────────────────────────
// MAIN FUNCTION
// ──────────────────────────────────────────────

/**
 * Calcula todas las notificaciones basándose en las preferencias del usuario
 */
export function computeNotifications(input: ComputeNotificationsInput): AppNotification[] {
  const prefs = input.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
  
  // Si las notificaciones están deshabilitadas globalmente o estamos en horario silencioso
  if (!prefs.enabled || isInQuietHours(prefs.quietHours)) {
    return [];
  }
  
  const notifications: AppNotification[] = [
    ...computeSubscriptionNotifications(input.subscriptions, prefs.subscriptions),
    ...computeGoalAmountNotifications(input.goals, prefs.goalAmount),
    ...computeGoalDeadlineNotifications(input.goals, prefs.goalDeadline),
    ...computeBudgetNotifications(input.budgets, prefs.budgets),
    ...computeDebtMilestoneNotifications(input.debts, prefs.debtMilestone),
    ...computeDebtBalanceNotifications(input.debts, prefs.debtBalance),
  ];

  // Ordenar por prioridad (critical > high > medium > low) y luego por valor
  const priorityOrder: Record<NotificationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return notifications.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (a.value ?? 0) - (b.value ?? 0);
  });
}

// ──────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────

export type { 
  AppNotification, 
  NotificationPreferences, 
  ComputeNotificationsInput,
  NotificationType,
  NotificationPriority
} from "@/types/notifications";
