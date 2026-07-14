"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, getBudgetBarColor } from "@/lib/utils";
import { budgetPeriodLabels } from "@/lib/constants";
import type { Budget, Transaction, Category } from "@/types";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface BudgetDashboardProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
}

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  return new Date(v + "T00:00:00");
}

const PERIOD_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  quincenal: 15,
  monthly: 30,
  yearly: 365,
};

function getPeriodEndDate(startDate: string | Date, period: string): Date {
  const start = toDate(startDate);
  const end = new Date(start);
  const days = PERIOD_DAYS[period] ?? 30;
  end.setDate(end.getDate() + days);
  return end;
}

function getDaysRemaining(endDate: Date): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil((endDate.getTime() - now.getTime()) / msPerDay));
}

interface CategorySpent {
  category: Category;
  spent: number;
  percentage: number;
}

function getCategoryBreakdown(
  budget: Budget,
  transactions: Transaction[],
  categories: Category[]
): CategorySpent[] {
  const startDate = toDate(budget.startDate);
  const now = new Date();
  let endBound = now;
  if (budget.endDate) {
    const parsedEnd = toDate(budget.endDate as string | Date);
    endBound = parsedEnd < now ? parsedEnd : now;
  }

  const matching = transactions.filter(
    (t) =>
      t.type === "expense" &&
      budget.categoryIds.includes(t.categoryId) &&
      new Date(t.date) >= startDate &&
      new Date(t.date) <= endBound &&
      (budget.walletIds.length === 0 || budget.walletIds.includes(t.walletId))
  );

  const byCategory = new Map<string, number>();
  for (const t of matching) {
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) || 0) + t.amount);
  }

  return Array.from(byCategory.entries())
    .map(([catId, spent]) => {
      const category = categories.find((c) => c.id === catId);
      return {
        category: category!,
        spent,
        percentage: budget.spent > 0 ? Math.round((spent / budget.spent) * 100) : 0,
      };
    })
    .filter((c) => c.category)
    .sort((a, b) => b.spent - a.spent);
}

export function BudgetDashboard({ budgets, transactions, categories }: BudgetDashboardProps) {
  const budgetAnalytics = useMemo(() => {
    return budgets.map((budget) => {
      const endDate = budget.endDate
        ? toDate(budget.endDate as string | Date)
        : getPeriodEndDate(budget.startDate, budget.period);
      const daysRemaining = getDaysRemaining(endDate);
      const remaining = budget.amount - budget.spent;
      const dailySuggestion = remaining > 0 ? remaining / daysRemaining : 0;
      const categoryBreakdown = getCategoryBreakdown(budget, transactions, categories);

      return {
        budget,
        endDate,
        daysRemaining,
        remaining,
        dailySuggestion,
        categoryBreakdown,
      };
    });
  }, [budgets, transactions, categories]);

  if (budgets.length === 0) return null;

  return (
    <div className="space-y-6">
      {budgetAnalytics.map(({ budget, endDate, daysRemaining, remaining, dailySuggestion, categoryBreakdown }) => {
        const percentage = budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 100) : 0;
        const isOverBudget = remaining < 0;
        const budgetCategories = budget.categoryIds
          .map((id) => categories.find((c) => c.id === id))
          .filter(Boolean) as Category[];

        return (
          <Card key={budget.id} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: budgetCategories[0]
                        ? `${budgetCategories[0].color}20`
                        : "#64748B20",
                    }}
                  >
                    <IconRenderer
                      name={budgetCategories[0]?.icon || "Target"}
                      size={20}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold font-display text-sm">{budget.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {budgetPeriodLabels[budget.period]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Gastado
                  </p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <CurrencyDisplay amount={budget.spent} size="md" />
                    <span className="text-xs text-muted-foreground">
                      / {formatCurrency(budget.amount)}
                    </span>
                  </div>
                  <Progress
                    value={percentage > 100 ? 100 : percentage}
                    indicatorClassName={getBudgetBarColor(percentage)}
                    className="h-1.5 mt-2"
                  />
                  <p
                    className={`text-[10px] mt-1 font-medium ${getBudgetBarColor(percentage).replace("bg-", "text-")}`}
                  >
                    {percentage}% utilizado
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Gasto diario sugerido
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isOverBudget ? (
                      <div className="flex items-center gap-1 text-expense">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-bold">Excedido</span>
                      </div>
                    ) : (
                      <CurrencyDisplay amount={dailySuggestion} size="md" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Máximo por día para no pasarte
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                    <Calendar className="w-3 h-3" />
                    <span>Período</span>
                  </div>
                  <p className="text-sm font-medium mt-0.5">
                    {isOverBudget
                      ? "Período excedido"
                      : `${daysRemaining} día${daysRemaining !== 1 ? "s" : ""} restante${daysRemaining !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(budget.startDate).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })} — {endDate.toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>

              {categoryBreakdown.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>Desglose por categoría</span>
                  </div>
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.category.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.category.color }}
                          />
                          <span className="truncate max-w-[140px]">{cat.category.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CurrencyDisplay amount={cat.spent} size="sm" />
                          <span className="text-muted-foreground w-8 text-right">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={cat.percentage}
                        className="h-1.5"
                        indicatorClassName="opacity-70"
                        indicatorStyle={{ backgroundColor: cat.category.color }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {categoryBreakdown.length === 0 && (
                <div className="border-t border-border pt-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Sin gastos en este período aún
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
