"use client";

import { useCashCoreStore } from "@/store";
import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetDashboard } from "@/components/budgets/budget-dashboard";
import { BudgetFormModal } from "@/components/budgets/budget-form";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, getBudgetBarColor } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Budget } from "@/types";

export default function BudgetsPage() {
  const { budgets, categories, wallets, transactions, setActiveModal, setEditingItem, deleteBudget } = useCashCoreStore();
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  const activeBudgets = budgets.filter((b) => b.isActive);
  const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  function handleEdit(budget: Budget) {
    setEditingItem(budget);
    setActiveModal("budget-form");
  }

  function handleDelete() {
    if (deleteTarget) {
      deleteBudget(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Presupuesto eliminado");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Presupuestos</h2>
          <p className="text-sm text-muted-foreground">{activeBudgets.length} presupuestos activos</p>
        </div>
        <Button onClick={() => setActiveModal("budget-form")} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo presupuesto</span>
        </Button>
      </div>

      {/* Overall Summary */}
      {activeBudgets.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Resumen del mes</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <CurrencyDisplay amount={totalSpent} size="lg" />
                  <span className="text-sm text-muted-foreground">
                    / {formatCurrency(totalBudgeted)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${getBudgetBarColor(overallPercentage).replace("bg-", "text-")}`}>
                  {overallPercentage}%
                </span>
                <p className="text-xs text-muted-foreground">utilizado</p>
              </div>
            </div>
            <Progress
              value={overallPercentage}
              indicatorClassName={getBudgetBarColor(overallPercentage)}
              className="h-3"
            />
          </CardContent>
        </Card>
      )}

      {/* Budget Dashboard with daily suggestions */}
      {activeBudgets.length > 0 && (
        <BudgetDashboard
          budgets={activeBudgets}
          transactions={transactions}
          categories={categories}
        />
      )}

      {/* Budget Grid */}
      {activeBudgets.length === 0 ? (
        <EmptyState
          icon="PieChart"
          title="Sin presupuestos"
          description="Crea tu primer presupuesto para controlar tus gastos por categoría."
          actionLabel="Crear presupuesto"
          onAction={() => setActiveModal("budget-form")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              categories={categories}
              wallets={wallets}
              onEdit={() => handleEdit(budget)}
            />
          ))}
        </div>
      )}

      <BudgetFormModal />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el presupuesto &quot;{deleteTarget?.name}&quot;. Tus transacciones no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
