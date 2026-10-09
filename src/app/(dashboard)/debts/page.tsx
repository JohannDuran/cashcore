"use client";

import { useCashCoreStore } from "@/store";
import { DebtCard } from "@/components/debts/debt-card";
import { DebtFormModal } from "@/components/debts/debt-form";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
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
import {
  CircleDollarSign,
  Plus,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Debt } from "@/types";

export default function DebtsPage() {
  const { debts, setActiveModal, setEditingItem, deleteDebt } = useCashCoreStore();
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);

  const activeDebts = debts.filter((d) => d.isActive && d.currentBalance > 0);
  const paidDebts = debts.filter((d) => !d.isActive || d.currentBalance <= 0);

  // Totales
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOriginal = activeDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalPaid = totalOriginal - totalDebt;
  const avgProgress = activeDebts.length > 0
    ? Math.round(activeDebts.reduce((sum, d) => {
        const paid = d.originalAmount - d.currentBalance;
        return sum + (d.originalAmount > 0 ? (paid / d.originalAmount) * 100 : 0);
      }, 0) / activeDebts.length)
    : 0;

  function handleEdit(debt: Debt) {
    setEditingItem(debt);
    setActiveModal("debt-form");
  }

  function handleDelete() {
    if (deleteTarget) {
      deleteDebt(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Deuda eliminada");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Deudas</h2>
          <p className="text-sm text-muted-foreground">
            {activeDebts.length} deuda{activeDebts.length !== 1 ? "s" : ""} activa{activeDebts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setActiveModal("debt-form")} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva deuda</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-rose-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Deuda total</p>
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <CurrencyDisplay amount={totalDebt} type="expense" size="lg" className="block" />
            <p className="text-xs text-muted-foreground mt-1">
              Saldo pendiente total
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total pagado</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <CurrencyDisplay amount={totalPaid} type="income" size="lg" className="block" />
            <p className="text-xs text-muted-foreground mt-1">
              De un total de <CurrencyDisplay amount={totalOriginal} size="sm" />
            </p>
          </CardContent>
        </Card>

        <Card className="border-sky-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Progreso promedio</p>
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-sky-500" />
              </div>
            </div>
            <p className="text-2xl font-bold font-display">{avgProgress}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {paidDebts.length} deuda{paidDebts.length !== 1 ? "s" : ""} liquidada{paidDebts.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Debts Grid */}
      {debts.length === 0 ? (
        <EmptyState
          icon="CircleDollarSign"
          title="Sin deudas registradas"
          description="Agrega tus créditos, tarjetas y préstamos para tener un mejor control de tus compromisos financieros."
          actionLabel="Agregar deuda"
          onAction={() => setActiveModal("debt-form")}
        />
      ) : (
        <div className="space-y-6">
          {activeDebts.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Deudas activas</h3>
                <p className="text-xs text-muted-foreground">
                  Créditos y préstamos con saldo pendiente.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onEdit={() => handleEdit(debt)}
                  />
                ))}
              </div>
            </section>
          )}

          {paidDebts.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Deudas liquidadas</h3>
                <p className="text-xs text-muted-foreground">
                  Compromisos que ya fueron saldados.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paidDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onEdit={() => handleEdit(debt)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <DebtFormModal />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar deuda?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente &quot;{deleteTarget?.name}&quot;. Esta acción no se puede deshacer.
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
