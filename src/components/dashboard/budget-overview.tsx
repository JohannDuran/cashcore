"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { formatCurrency, getBudgetBarColor } from "@/lib/utils";
import type { Budget, Category } from "@/types";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface BudgetOverviewProps {
  budgets: Budget[];
  categories: Category[];
}

export function BudgetOverview({ budgets, categories }: BudgetOverviewProps) {
  const activeBudgets = budgets.filter((b) => b.isActive).slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Presupuestos</CardTitle>
        <Link
          href="/budgets"
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeBudgets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay presupuestos activos
          </p>
        ) : (
          activeBudgets.map((budget) => {
            const cat = categories.find((c) => c.id === budget.categoryIds[0]);
            const percentage = budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 100) : 0;
            const remaining = budget.amount - budget.spent;
            const isExceeded = percentage > 100;
            const isWarning = percentage > 90;

            return (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cat ? `${cat.color}20` : "#64748B20" }}
                    >
                      <IconRenderer name={cat?.icon || "Target"} size={14} />
                    </div>
                    <span className="text-sm font-medium">{budget.name}</span>
                    {isExceeded && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Excedido
                      </Badge>
                    )}
                    {isWarning && !isExceeded && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <Progress
                  value={percentage}
                  indicatorClassName={getBudgetBarColor(percentage)}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{percentage}%</span>
                  <span>
                    {remaining >= 0
                      ? `Quedan ${formatCurrency(remaining)}`
                      : `Excedido por ${formatCurrency(Math.abs(remaining))}`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
