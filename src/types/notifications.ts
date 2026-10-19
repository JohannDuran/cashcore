// ──────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ──────────────────────────────────────────────

/**
 * Preferencias de notificaciones de suscripciones
 */
export interface SubscriptionNotificationPreferences {
  enabled: boolean;
  daysBefore: number[]; // e.g., [10, 5, 2, 1]
}

/**
 * Preferencias de notificaciones de metas (por monto)
 */
export interface GoalAmountNotificationPreferences {
  enabled: boolean;
  percentRemaining: number[]; // e.g., [10, 5, 3] - alertar cuando falte X%
}

/**
 * Preferencias de notificaciones de metas (por deadline)
 */
export interface GoalDeadlineNotificationPreferences {
  enabled: boolean;
  daysBefore: number[]; // e.g., [15, 10, 5]
}

/**
 * Preferencias de notificaciones de presupuestos
 */
export interface BudgetNotificationPreferences {
  enabled: boolean;
  percentUsed: number[]; // e.g., [85, 90, 95, 100]
}

/**
 * Preferencias de notificaciones de hitos de deuda (% pagado)
 */
export interface DebtMilestoneNotificationPreferences {
  enabled: boolean;
  percentPaid: number[]; // e.g., [25, 50, 75, 90, 100]
}

/**
 * Preferencias de notificaciones de balance de deuda (% restante)
 */
export interface DebtBalanceNotificationPreferences {
  enabled: boolean;
  percentRemaining: number[]; // e.g., [15, 10, 5]
}

/**
 * Horario silencioso
 */
export interface QuietHoursPreferences {
  enabled: boolean;
  start: string; // "22:00"
  end: string;   // "08:00"
}

/**
 * Todas las preferencias de notificaciones del usuario
 */
export interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  subscriptions: SubscriptionNotificationPreferences;
  goalAmount: GoalAmountNotificationPreferences;
  goalDeadline: GoalDeadlineNotificationPreferences;
  budgets: BudgetNotificationPreferences;
  debtMilestone: DebtMilestoneNotificationPreferences;
  debtBalance: DebtBalanceNotificationPreferences;
  quietHours: QuietHoursPreferences;
}

/**
 * Valores por defecto de las preferencias de notificaciones
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  pushEnabled: false,
  subscriptions: {
    enabled: true,
    daysBefore: [5, 2, 1],
  },
  goalAmount: {
    enabled: true,
    percentRemaining: [10, 5, 3],
  },
  goalDeadline: {
    enabled: true,
    daysBefore: [15, 10, 5],
  },
  budgets: {
    enabled: true,
    percentUsed: [85, 90, 95],
  },
  debtMilestone: {
    enabled: false,
    percentPaid: [50, 75, 90, 100],
  },
  debtBalance: {
    enabled: true,
    percentRemaining: [15, 10, 5],
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

// ──────────────────────────────────────────────
// APP NOTIFICATION TYPES
// ──────────────────────────────────────────────

export type NotificationType = 
  | "subscription_due"
  | "goal_amount"
  | "goal_deadline"
  | "budget_alert"
  | "debt_milestone"
  | "debt_balance";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  icon?: string;
  relatedId: string;
  relatedName?: string;
  value?: number; // días restantes, porcentaje, etc.
  createdAt: Date;
}

/**
 * Iconos por tipo de notificación
 */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  subscription_due: "💳",
  goal_amount: "🎯",
  goal_deadline: "⏰",
  budget_alert: "📊",
  debt_milestone: "🏆",
  debt_balance: "💰",
};

/**
 * Colores por prioridad
 */
export const NOTIFICATION_PRIORITY_COLORS: Record<NotificationPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-500",
  high: "text-amber-500",
  critical: "text-destructive",
};

/**
 * Input para computeNotifications
 */
export interface ComputeNotificationsInput {
  preferences: NotificationPreferences;
  subscriptions: Array<{
    id: string;
    name: string;
    nextBillDate: Date;
    amount: number;
    currency: string;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: Date | null;
    icon: string;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    amount: number;
    spent: number;
  }>;
  debts: Array<{
    id: string;
    name: string;
    originalAmount: number;
    currentBalance: number;
    icon: string;
  }>;
}
