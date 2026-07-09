"use client";

import { useMemo } from "react";
import { useCashCoreStore } from "@/store";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetOverview } from "@/components/dashboard/budget-overview";

export default function DashboardPage() {
  const { transactions, wallets, budgets, categories } = useCashCoreStore();

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfMonth && d <= now;
    });

    const prevMonthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfPrevMonth && d <= endOfPrevMonth;
    });

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalIncome = currentMonthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = currentMonthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Category breakdown for spending chart
    const expenseByCat = new Map<string, number>();
    currentMonthTxs
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expenseByCat.set(t.categoryId, (expenseByCat.get(t.categoryId) || 0) + t.amount);
      });

    const topCategories = Array.from(expenseByCat.entries())
      .map(([catId, amount]) => ({
        category: categories.find((c) => c.id === catId) || categories[0],
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Daily spending for bar chart
    const dailyMap = new Map<string, { income: number; expense: number }>();
    currentMonthTxs.forEach((t) => {
      const dateStr = String(t.date).split("T")[0];
      
      const existing = dailyMap.get(dateStr) || { income: 0, expense: 0 };
      if (t.type === "income") existing.income += t.amount;
      if (t.type === "expense") existing.expense += t.amount;
      dailyMap.set(dateStr, existing);
    });

    const dailySpending = Array.from(dailyMap.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      prevIncome,
      prevExpenses,
      topCategories,
      dailySpending,
    };
  }, [transactions, wallets, categories]);

  return (
    <div className="space-y-6 animate-fade-in">
      <StatsCards
        totalBalance={stats.totalBalance}
        totalIncome={stats.totalIncome}
        totalExpenses={stats.totalExpenses}
        netIncome={stats.netIncome}
        prevIncome={stats.prevIncome}
        prevExpenses={stats.prevExpenses}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SpendingChart data={stats.topCategories} total={stats.totalExpenses} />
        <CategoryBreakdown data={stats.dailySpending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentTransactions transactions={transactions} categories={categories} wallets={wallets} />
        <BudgetOverview budgets={budgets} categories={categories} />
      </div>
    </div>
  );
}
