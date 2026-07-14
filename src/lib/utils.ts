import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "@/types";

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

export function formatDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return formatDate(dateStr);
}

export function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
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
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

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
