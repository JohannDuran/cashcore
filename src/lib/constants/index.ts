import type { Category, Wallet, Transaction, Budget, User, Tag } from "@/types";

// ──────────────────────────────────────────────
// DEFAULT CATEGORIES
// ──────────────────────────────────────────────

export const defaultExpenseCategories: Category[] = [
  { id: "cat-alimentacion", name: "Alimentación", icon: "UtensilsCrossed", color: "#F97316", type: "expense", isDefault: true },
  { id: "cat-transporte", name: "Transporte", icon: "Car", color: "#3B82F6", type: "expense", isDefault: true },
  { id: "cat-vivienda", name: "Vivienda", icon: "Home", color: "#8B5CF6", type: "expense", isDefault: true },
  { id: "cat-entretenimiento", name: "Entretenimiento", icon: "Gamepad2", color: "#EC4899", type: "expense", isDefault: true },
  { id: "cat-salud", name: "Salud", icon: "Heart", color: "#EF4444", type: "expense", isDefault: true },
  { id: "cat-educacion", name: "Educación", icon: "GraduationCap", color: "#06B6D4", type: "expense", isDefault: true },
  { id: "cat-ropa", name: "Ropa", icon: "Shirt", color: "#F472B6", type: "expense", isDefault: true },
  { id: "cat-tecnologia", name: "Tecnología", icon: "Smartphone", color: "#6366F1", type: "expense", isDefault: true },
  { id: "cat-suscripciones", name: "Suscripciones", icon: "CreditCard", color: "#A855F7", type: "expense", isDefault: true },
  { id: "cat-restaurantes", name: "Restaurantes", icon: "Coffee", color: "#D97706", type: "expense", isDefault: true },
  { id: "cat-supermercado", name: "Supermercado", icon: "ShoppingCart", color: "#22C55E", type: "expense", isDefault: true },
  { id: "cat-servicios", name: "Servicios", icon: "Zap", color: "#EAB308", type: "expense", isDefault: true },
  { id: "cat-mascotas", name: "Mascotas", icon: "PawPrint", color: "#92400E", type: "expense", isDefault: true },
  { id: "cat-regalos", name: "Regalos", icon: "Gift", color: "#E11D48", type: "expense", isDefault: true },
  { id: "cat-otros-gastos", name: "Otros gastos", icon: "MoreHorizontal", color: "#64748B", type: "expense", isDefault: true },
];

export const defaultIncomeCategories: Category[] = [
  { id: "cat-salario", name: "Salario", icon: "Banknote", color: "#22C55E", type: "income", isDefault: true },
  { id: "cat-freelance", name: "Freelance", icon: "Laptop", color: "#10B981", type: "income", isDefault: true },
  { id: "cat-inversiones", name: "Inversiones", icon: "TrendingUp", color: "#06B6D4", type: "income", isDefault: true },
  { id: "cat-ventas", name: "Ventas", icon: "Store", color: "#F59E0B", type: "income", isDefault: true },
  { id: "cat-reembolso", name: "Reembolso", icon: "RotateCcw", color: "#8B5CF6", type: "income", isDefault: true },
  { id: "cat-otros-ingresos", name: "Otros ingresos", icon: "Plus", color: "#64748B", type: "income", isDefault: true },
];

export const defaultCategories: Category[] = [
  ...defaultExpenseCategories,
  ...defaultIncomeCategories,
];

// Transfer "category" for display purposes
export const transferCategory: Category = {
  id: "cat-transfer",
  name: "Transferencia",
  icon: "ArrowLeftRight",
  color: "#3B82F6",
  type: "expense",
  isDefault: true,
};

// ──────────────────────────────────────────────
// MOCK USER
// ──────────────────────────────────────────────

export const mockUser: User = {
  id: "u1",
  email: "johann@cashcore.app",
  name: "Johann",
  avatarUrl: undefined,
  defaultCurrency: "MXN",
  preferredLocale: "es-MX",
  theme: "dark",
  createdAt: new Date("2025-01-15"),
};

// ──────────────────────────────────────────────
// MOCK TAGS
// ──────────────────────────────────────────────

export const mockTags: Tag[] = [
  { id: "tag-1", userId: "u1", name: "trabajo", color: "#3B82F6" },
  { id: "tag-2", userId: "u1", name: "personal", color: "#22C55E" },
  { id: "tag-3", userId: "u1", name: "urgente", color: "#EF4444" },
  { id: "tag-4", userId: "u1", name: "hormiga", color: "#F59E0B" },
  { id: "tag-5", userId: "u1", name: "fijo", color: "#8B5CF6" },
];

// ──────────────────────────────────────────────
// MOCK WALLETS
// ──────────────────────────────────────────────

export const mockWallets: Wallet[] = [
  {
    id: "w1",
    userId: "u1",
    name: "Efectivo",
    type: "cash",
    currency: "MXN",
    balance: 3_450.0,
    icon: "Banknote",
    color: "#22C55E",
    isArchived: false,
    sortOrder: 0,
    interestEnabled: false,
    interestRate: null,
    interestStartDate: null,
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "w2",
    userId: "u1",
    name: "BBVA Débito",
    type: "bank",
    currency: "MXN",
    balance: 28_730.5,
    icon: "Building2",
    color: "#3B82F6",
    isArchived: false,
    sortOrder: 1,
    interestEnabled: false,
    interestRate: null,
    interestStartDate: null,
    createdAt: new Date("2025-01-15"),
  },
];

// ──────────────────────────────────────────────
// MOCK TRANSACTIONS (2 transactions)
// ──────────────────────────────────────────────

export const mockTransactions: Transaction[] = [
  {
    id: "t1", walletId: "w2", userId: "u1", type: "income", amount: 18_000, currency: "MXN",
    categoryId: "cat-salario", description: "Nómina quincenal", date: "2026-04-01",
    isRecurring: true, recurringRule: { frequency: "monthly", interval: 1 },
    tags: ["trabajo", "fijo"], createdAt: new Date("2026-04-01"), updatedAt: new Date("2026-04-01"),
  },
  {
    id: "t2", walletId: "w2", userId: "u1", type: "expense", amount: 1_850, currency: "MXN",
    categoryId: "cat-supermercado", description: "Despensa semanal", date: "2026-04-06",
    isRecurring: false, tags: ["personal"], createdAt: new Date("2026-04-06"), updatedAt: new Date("2026-04-06"),
  },
];

// ──────────────────────────────────────────────
// MOCK BUDGETS
// ──────────────────────────────────────────────

export const mockBudgets: Budget[] = [];

// ──────────────────────────────────────────────
// WALLET TYPE LABELS
// ──────────────────────────────────────────────

export const walletTypeLabels: Record<string, string> = {
  cash: "Efectivo",
  bank: "Banco",
  credit: "Crédito",
  loan: "Préstamo",
  ewallet: "E-wallet",
  crypto: "Crypto",
  investment: "Inversión",
};

export const walletTypeIcons: Record<string, string> = {
  cash: "Banknote",
  bank: "Building2",
  credit: "CreditCard",
  loan: "Receipt",
  ewallet: "Smartphone",
  crypto: "Bitcoin",
  investment: "TrendingUp",
};

// ──────────────────────────────────────────────
// CURRENCIES
// ──────────────────────────────────────────────

export const currencies = [
  { code: "MXN" as const, name: "Peso Mexicano", flag: "🇲🇽" },
  { code: "USD" as const, name: "Dólar Americano", flag: "🇺🇸" },
  { code: "EUR" as const, name: "Euro", flag: "🇪🇺" },
  { code: "COP" as const, name: "Peso Colombiano", flag: "🇨🇴" },
  { code: "ARS" as const, name: "Peso Argentino", flag: "🇦🇷" },
  { code: "BRL" as const, name: "Real Brasileño", flag: "🇧🇷" },
  { code: "PEN" as const, name: "Sol Peruano", flag: "🇵🇪" },
  { code: "CLP" as const, name: "Peso Chileno", flag: "🇨🇱" },
];

// ──────────────────────────────────────────────
// BUDGET PERIOD LABELS
// ──────────────────────────────────────────────

export const budgetPeriodLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Catorcenal",
  quincenal: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

// ──────────────────────────────────────────────
// MOCK GOALS
// ──────────────────────────────────────────────

import type { Goal, Subscription } from "@/types";

export const mockGoals: Goal[] = [];

// ──────────────────────────────────────────────
// MOCK SUBSCRIPTIONS
// ──────────────────────────────────────────────

export const mockSubscriptions: Subscription[] = [];

