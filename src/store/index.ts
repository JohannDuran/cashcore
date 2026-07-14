import { create } from "zustand";
import type { Transaction, Wallet, Budget, Category, User, Tag, Goal, Subscription } from "@/types";
import {
  mockTransactions,
  mockWallets,
  mockBudgets,
  defaultCategories,
  mockUser,
  mockTags,
  mockGoals,
  mockSubscriptions,
} from "@/lib/constants";
import { generateId } from "@/lib/utils";

// ──────────────────────────────────────────────
// STORE INTERFACE
// ──────────────────────────────────────────────

interface CashCoreState {
  // Data
  user: User | null;
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  categories: Category[];
  tags: Tag[];
  goals: Goal[];
  subscriptions: Subscription[];

  // UI State
  sidebarCollapsed: boolean;
  activeModal: string | null;
  editingItem: Transaction | Wallet | Budget | Goal | Subscription | null;

  // Actions — User
  updateUser: (data: Partial<User>) => void;
  logout: () => void;

  // Actions — Transactions
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Actions — Wallets
  addWallet: (wallet: Omit<Wallet, "id" | "createdAt"> & { id?: string }) => void;
  updateWallet: (id: string, data: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;

  // Actions — Budgets
  addBudget: (budget: Omit<Budget, "id" | "createdAt" | "spent"> & { id?: string }) => void;
  updateBudget: (id: string, data: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  // Actions — Categories
  addCategory: (cat: Omit<Category, "id">) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Actions — Tags
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (id: string, data: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  // Actions — Goals
  addGoal: (goal: Omit<Goal, "id" | "createdAt"> & { id?: string }) => void;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Actions — Subscriptions
  addSubscription: (sub: Omit<Subscription, "id" | "createdAt"> & { id?: string }) => void;
  updateSubscription: (id: string, data: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;

  // Actions — UI
  toggleSidebar: () => void;
  setActiveModal: (modal: string | null) => void;
  setEditingItem: (item: Transaction | Wallet | Budget | Goal | Subscription | null) => void;

  // Computed helpers
  getWalletById: (id: string) => Wallet | undefined;
  getCategoryById: (id: string) => Category | undefined;
  recalculateBudgets: () => void;
}

// ──────────────────────────────────────────────
// Helper: recalculate budget spent from transactions
// ──────────────────────────────────────────────

function calculateBudgetSpent(
  budget: Budget,
  transactions: Transaction[]
): number {
  const startDate = (budget.startDate as any) instanceof Date
    ? (budget.startDate as any) as Date
    : new Date((budget.startDate || "") + "T00:00:00");
  if (isNaN(startDate.getTime())) return 0;

  const now = new Date();
  let endDate = now;
  if (budget.endDate) {
    const parsedEnd = (budget.endDate as any) instanceof Date
      ? (budget.endDate as any) as Date
      : new Date((budget.endDate || "") + "T23:59:59");
    if (!isNaN(parsedEnd.getTime())) {
      endDate = parsedEnd < now ? parsedEnd : now;
    }
  }

  return transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        budget.categoryIds.includes(t.categoryId) &&
        new Date(t.date) >= startDate &&
        new Date(t.date) <= endDate &&
        (budget.walletIds.length === 0 || budget.walletIds.includes(t.walletId))
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

// ──────────────────────────────────────────────
// STORE
// ──────────────────────────────────────────────

export const useCashCoreStore = create<CashCoreState>((set, get) => ({
  // Initial data
  user: null as any,
  transactions: [],
  wallets: [],
  budgets: [],
  categories: [],
  tags: [],
  goals: [],
  subscriptions: [],

  // UI state
  sidebarCollapsed: false,
  activeModal: null,
  editingItem: null,

  // ── User ──
  setUser: (userData: User) => {
    console.trace("🔵 setUser llamado con:", userData);
    set({ user: userData });
  },
  updateUser: (data) => {
    console.trace("🟡 updateUser llamado con:", data);
    set((state) => {
      if (!state.user) throw new Error('Cannot update user before login');
      return { user: { ...state.user, ...data } };
    })
  },
  logout: () => {
    console.log("🔴 logout ejecutado");
    set({ user: null });
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    window.location.href = "/login"; // ← fuerza recarga completa
  },

  // ── Transactions ──
  addTransaction: (txData) =>
    set((state) => {
      const newTx: Transaction = {
        ...txData,
        id: txData.id || generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update wallet balance
      const wallets = state.wallets.map((w) => {
        if (w.id === newTx.walletId) {
          if (newTx.type === "expense" || newTx.type === "transfer") {
            return { ...w, balance: w.balance - newTx.amount };
          }
          if (newTx.type === "income") {
            return { ...w, balance: w.balance + newTx.amount };
          }
        }
        // For transfers, increment destination wallet
        if (newTx.type === "transfer" && w.id === newTx.transferToWalletId) {
          return { ...w, balance: w.balance + newTx.amount };
        }
        return w;
      });

      const transactions = [newTx, ...state.transactions];

      // Recalculate budgets
      const budgets = state.budgets.map((b) => ({
        ...b,
        spent: calculateBudgetSpent(b, transactions),
      }));

      return { transactions, wallets, budgets };
    }),

  updateTransaction: (id, data) =>
    set((state) => {
      const oldTx = state.transactions.find((t) => t.id === id);
      if (!oldTx) return state;

      // Revert old transaction effect on wallet
      let wallets = state.wallets.map((w) => {
        if (w.id === oldTx.walletId) {
          if (oldTx.type === "expense" || oldTx.type === "transfer") {
            return { ...w, balance: w.balance + oldTx.amount };
          }
          if (oldTx.type === "income") {
            return { ...w, balance: w.balance - oldTx.amount };
          }
        }
        if (oldTx.type === "transfer" && w.id === oldTx.transferToWalletId) {
          return { ...w, balance: w.balance - oldTx.amount };
        }
        return w;
      });

      const updatedTx = { ...oldTx, ...data, updatedAt: new Date() };

      // Apply new transaction effect
      wallets = wallets.map((w) => {
        if (w.id === updatedTx.walletId) {
          if (updatedTx.type === "expense" || updatedTx.type === "transfer") {
            return { ...w, balance: w.balance - updatedTx.amount };
          }
          if (updatedTx.type === "income") {
            return { ...w, balance: w.balance + updatedTx.amount };
          }
        }
        if (updatedTx.type === "transfer" && w.id === updatedTx.transferToWalletId) {
          return { ...w, balance: w.balance + updatedTx.amount };
        }
        return w;
      });

      const transactions = state.transactions.map((t) =>
        t.id === id ? updatedTx : t
      );

      const budgets = state.budgets.map((b) => ({
        ...b,
        spent: calculateBudgetSpent(b, transactions),
      }));

      return { transactions, wallets, budgets };
    }),

  deleteTransaction: (id) =>
    set((state) => {
      const tx = state.transactions.find((t) => t.id === id);
      if (!tx) return state;

      // Revert wallet balance
      const wallets = state.wallets.map((w) => {
        if (w.id === tx.walletId) {
          if (tx.type === "expense" || tx.type === "transfer") {
            return { ...w, balance: w.balance + tx.amount };
          }
          if (tx.type === "income") {
            return { ...w, balance: w.balance - tx.amount };
          }
        }
        if (tx.type === "transfer" && w.id === tx.transferToWalletId) {
          return { ...w, balance: w.balance - tx.amount };
        }
        return w;
      });

      const transactions = state.transactions.filter((t) => t.id !== id);

      const budgets = state.budgets.map((b) => ({
        ...b,
        spent: calculateBudgetSpent(b, transactions),
      }));

      return { transactions, wallets, budgets };
    }),

  // ── Wallets ──
  addWallet: (walletData) =>
    set((state) => ({
      wallets: [
        ...state.wallets,
        {
          ...walletData,
          id: walletData.id || generateId(),
          createdAt: new Date(),
        },
      ],
    })),

  updateWallet: (id, data) =>
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === id ? { ...w, ...data } : w
      ),
    })),

  deleteWallet: (id) =>
    set((state) => ({
      wallets: state.wallets.filter((w) => w.id !== id),
      transactions: state.transactions.filter((t) => t.walletId !== id),
    })),

  // ── Budgets ──
  addBudget: (budgetData) =>
    set((state) => {
      const newBudget: Budget = {
        ...budgetData,
        id: budgetData.id || generateId(),
        spent: 0,
        createdAt: new Date(),
      };
      newBudget.spent = calculateBudgetSpent(newBudget, state.transactions);
      return { budgets: [...state.budgets, newBudget] };
    }),

  updateBudget: (id, data) =>
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id
          ? {
              ...b,
              ...data,
              spent: calculateBudgetSpent(
                { ...b, ...data },
                state.transactions
              ),
            }
          : b
      ),
    })),

  deleteBudget: (id) =>
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    })),

  // ── Categories ──
  addCategory: (catData) =>
    set((state) => ({
      categories: [...state.categories, { ...catData, id: (catData as any).id || generateId() }],
    })),

  updateCategory: (id, data) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),

  // ── Tags ──
  addTag: (tagData) =>
    set((state) => ({
      tags: [...state.tags, { ...tagData, id: (tagData as any).id || generateId() }],
    })),

  updateTag: (id, data) =>
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),

  deleteTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
    })),

  // ── Goals ──
  addGoal: (goalData) =>
    set((state) => ({
      goals: [...state.goals, { ...goalData, id: goalData.id || generateId(), createdAt: new Date() }],
    })),

  updateGoal: (id, data) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    })),

  // ── Subscriptions ──
  addSubscription: (subData) =>
    set((state) => ({
      subscriptions: [...state.subscriptions, { ...subData, id: subData.id || generateId(), createdAt: new Date() }],
    })),

  updateSubscription: (id, data) =>
    set((state) => ({
      subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  deleteSubscription: (id) =>
    set((state) => ({
      subscriptions: state.subscriptions.filter((s) => s.id !== id),
    })),

  // ── UI ──
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActiveModal: (modal) => set({ activeModal: modal }),

  setEditingItem: (item) => set({ editingItem: item }),

  // ── Computed helpers ──
  getWalletById: (id) => get().wallets.find((w) => w.id === id),
  getCategoryById: (id) => get().categories.find((c) => c.id === id),

  recalculateBudgets: () =>
    set((state) => ({
      budgets: state.budgets.map((b) => ({
        ...b,
        spent: calculateBudgetSpent(b, state.transactions),
      })),
    })),
}));
