// CashCore — Type Definitions

export type TransactionType = 'income' | 'expense' | 'transfer';
export type WalletType = 'cash' | 'bank' | 'credit' | 'loan' | 'ewallet' | 'crypto' | 'investment';
export type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type Currency = 'USD' | 'MXN' | 'EUR' | 'COP' | 'ARS' | 'BRL' | 'PEN' | 'CLP';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  defaultCurrency: Currency;
  preferredLocale: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  currency: Currency;
  balance: number;
  creditLimit?: number | null;
  monthlyPayment?: number | null;
  paymentDueDay?: number | null;
  icon: string;
  color: string;
  isArchived: boolean;
  sortOrder: number;
  interestEnabled: boolean;
  interestRate?: number | null;
  interestStartDate?: Date | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  userId?: string;
  parentId?: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  categoryId: string;
  category?: Category;
  wallet?: Wallet;
  description: string;
  note?: string;
  date: string;
  isRecurring: boolean;
  recurringRule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
  tags: string[];
  transferToWalletId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  walletIds: string[];
  name: string;
  amount: number;
  spent: number;
  period: BudgetPeriod;
  categoryIds: string[];
  category?: Category;
  startDate: string;
  endDate?: string;
  rollover: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  topCategories: {
    category: Category;
    amount: number;
    percentage: number;
  }[];
  dailySpending: {
    date: string;
    income: number;
    expense: number;
  }[];
  budgetStatus: {
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
  }[];
}

// ──────────────────────────────────────────────
// GOALS & SAVINGS
// ──────────────────────────────────────────────

export type GoalType = 'savings' | 'debt_payoff' | 'emergency' | 'custom';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
  walletId?: string;
  isCompleted: boolean;
  createdAt: Date;
}

// ──────────────────────────────────────────────
// SUBSCRIPTIONS
// ──────────────────────────────────────────────

export type BillingCycle = 'weekly' | 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  slug?: string;
  currency: Currency;
  billingCycle: BillingCycle;
  categoryId: string;
  category?: Category;
  nextBillDate: string;
  icon: string;
  platformId?: string;
  color: string;
  isActive: boolean;
  isDomiciliado: boolean;
  walletId?: string;
  notes?: string;
  createdAt: Date;
}
