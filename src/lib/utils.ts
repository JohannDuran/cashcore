import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency, Goal, Wallet } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: Currency = "MXN",
  locale: string = "es-MX"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convierte un valor de fecha a una Date a medianoche LOCAL que representa su
 * DÍA DE CALENDARIO real, sin importar la zona horaria.
 *
 * Las fechas de transacción se guardan como `@db.Date` (medianoche UTC, p. ej.
 * "2026-10-14T00:00:00.000Z"). Si se formatean con `new Date(...)` + métodos locales
 * en una zona GMT negativa (ej. GMT-6), el día se corre al anterior (se vería "13").
 * Para evitarlo tomamos los componentes de calendario correctos y construimos una
 * fecha local equivalente, de modo que lo mostrado coincida con lo guardado.
 */
export function toLocalCalendarDate(dateStr: string | Date): Date {
  if (typeof dateStr === "string") {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const parsed = new Date(dateStr);
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  }
  return new Date(dateStr.getUTCFullYear(), dateStr.getUTCMonth(), dateStr.getUTCDate());
}

export function formatDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = toLocalCalendarDate(dateStr);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

/** Diferencia en días de calendario entre dos fechas (ignora la hora). */
function calendarDayDiff(dateStr: string | Date): number {
  const date = toLocalCalendarDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatRelativeDate(dateStr: string): string {
  const diffDays = calendarDayDiff(dateStr);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays > 0 && diffDays < 7) return `Hace ${diffDays} días`;
  return formatDate(dateStr);
}

export function formatDateGroup(dateStr: string): string {
  const diffDays = calendarDayDiff(dateStr);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toLocalCalendarDate(dateStr));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/** Sanitizes error messages before logging to prevent log injection (CWE-117) */
export function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.replace(/[\r\n]/g, " ").replace(/[\x00-\x1F\x7F]/g, "");
}

export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function getBudgetStatusColor(percentage: number): string {
  if (percentage > 100) return "text-purple-500";
  if (percentage > 90) return "text-red-500";
  if (percentage > 70) return "text-amber-500";
  return "text-green-500";
}

export function getBudgetBarColor(percentage: number): string {
  if (percentage > 100) return "bg-purple-500";
  if (percentage > 90) return "bg-red-500";
  if (percentage > 70) return "bg-amber-500";
  return "bg-primary";
}

/** Avance efectivo de una meta: si está vinculada a una wallet, usa su saldo actual. */
export function getGoalEffectiveAmount(goal: Goal, wallets: Wallet[]): number {
  if (!goal.walletId) return goal.currentAmount;
  const wallet = wallets.find((w) => w.id === goal.walletId);
  return wallet ? wallet.balance : goal.currentAmount;
}

/** Una meta vinculada a una wallet se completa sola al alcanzar o rebasar su objetivo. */
export function isGoalCompleted(goal: Goal, wallets: Wallet[]): boolean {
  if (goal.isCompleted) return true;
  const current = getGoalEffectiveAmount(goal, wallets);
  return goal.targetAmount > 0 && current >= goal.targetAmount;
}

export const currencyFlags: Record<Currency, string> = {
  MXN: "🇲🇽",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  COP: "🇨🇴",
  ARS: "🇦🇷",
  BRL: "🇧🇷",
  PEN: "🇵🇪",
  CLP: "🇨🇱",
};

// Approximate exchange rates to USD (1 unit of currency = X USD)
const ratesToUSD: Record<Currency, number> = {
  USD: 1,
  MXN: 0.058,
  EUR: 1.08,
  COP: 0.00024,
  ARS: 0.00089,
  BRL: 0.18,
  PEN: 0.27,
  CLP: 0.0011,
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return (amount * ratesToUSD[from]) / ratesToUSD[to];
}

export interface InterestProjection {
  projectedBalance: number;
  interestEarned: number;
  dailyInterest: number;
  annualYield: number;
  daysElapsed: number;
}

export function calculateInterestProjection(
  balance: number,
  annualRate: number,
  startDate: Date,
  now: Date = new Date()
): InterestProjection {
  const msPerDay = 1000 * 60 * 60 * 24;
  // Contar por DÍA DE CALENDARIO, no por 24h exactas: normalizamos ambas fechas
  // a medianoche local (00:00). Así, al cambiar de día ya cuenta +1 aunque no
  // hayan transcurrido 24h desde la hora exacta en que se activó el interés.
  const startMidnight = new Date(startDate);
  startMidnight.setHours(0, 0, 0, 0);
  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);
  const daysElapsed = Math.max(0, Math.round((nowMidnight.getTime() - startMidnight.getTime()) / msPerDay));

  if (daysElapsed === 0 || annualRate === 0) {
    return {
      projectedBalance: balance,
      interestEarned: 0,
      dailyInterest: 0,
      annualYield: 0,
      daysElapsed,
    };
  }

  const dailyRate = Math.pow(1 + annualRate / 100, 1 / 365) - 1;
  const projectedBalance = balance * Math.pow(1 + dailyRate, daysElapsed);
  const interestEarned = projectedBalance - balance;
  const dailyInterest = balance * dailyRate;
  const annualYield = balance * (annualRate / 100);

  return {
    projectedBalance,
    interestEarned,
    dailyInterest,
    annualYield,
    daysElapsed,
  };
}
