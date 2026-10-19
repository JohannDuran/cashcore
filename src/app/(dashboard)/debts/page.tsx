"use client";

import { useCashCoreStore } from "@/store";
import { DebtCard } from "@/components/debts/debt-card";
import { DebtFormModal } from "@/components/debts/debt-form";
import { DebtPaymentForm } from "@/components/debts/debt-payment-form";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useState, useMemo } from "react";
import type { Debt } from "@/types";
import { updateDebtAction } from "@/app/actions/debt.actions";

/**
 * Calcula el último día de corte que ya ocurrió (o es hoy) a partir del día de corte.
 * Devuelve la fecha en formato YYYY-MM-DD, o null si la deuda no tiene día de corte.
 */
function getLastStatementCutoff(statementDay?: number | null): string | null {
  if (!statementDay) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoffFor = (year: number, month: number): Date => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(statementDay, lastDay));
  };

  let last = cutoffFor(today.getFullYear(), today.getMonth());
  if (last > today) {
    last = cutoffFor(today.getFullYear(), today.getMonth() - 1);
  }

  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, "0");
  const d = String(last.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DebtsPage() {
  const { debts, transactions, setActiveModal, setEditingItem, deleteDebt, updateDebt } = useCashCoreStore();
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [accruedEditDebt, setAccruedEditDebt] = useState<Debt | null>(null);
  const [accruedEditValue, setAccruedEditValue] = useState("");

  const activeDebts = debts.filter((d) => d.isActive && d.currentBalance > 0);
  const paidDebts = debts.filter((d) => !d.isActive || d.currentBalance <= 0);

  // Transacciones relevantes para el cálculo del pago mínimo restante por ciclo:
  // - Abonos: transferencias a la deuda (type "transfer" con transferToDebtId)
  // - Compras: gastos cargados a la tarjeta (type "expense" con debtId)
  const debtTransactions = useMemo(() => {
    return transactions.filter(
      (tx) =>
        (tx.type === "transfer" && tx.transferToDebtId) ||
        (tx.type === "expense" && tx.debtId)
    );
  }, [transactions]);

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

  function handlePay(debt: Debt) {
    setPaymentDebt(debt);
    setPaymentModalOpen(true);
  }

  function handleMarkStatementPaid(debt: Debt) {
    const lastCutoff = getLastStatementCutoff(debt.statementDay);
    if (!lastCutoff) return;

    // Optimista + persistencia
    updateDebt(debt.id, { statementPaidUntil: lastCutoff });
    updateDebtAction(debt.id, { statementPaidUntil: lastCutoff }).then((res) => {
      if (!res.success) toast.error("No se pudo marcar como pagado: " + res.error);
      else toast.success("Pago del ciclo marcado como cubierto");
    });
  }

  function handleEditAccruedNextCycle(debt: Debt) {
    setAccruedEditDebt(debt);
    setAccruedEditValue(debt.accruedNextCycleOverride?.toString() ?? "");
  }

  function handleSaveAccrued() {
    if (!accruedEditDebt) return;
    const value = accruedEditValue.trim() === "" ? null : parseFloat(accruedEditValue);
    
    // Si se establece un valor base, guardar también la fecha actual
    // para que solo se sumen compras POSTERIORES a esta fecha
    const updates: Partial<Debt> = { 
      accruedNextCycleOverride: value,
      accruedOverrideDate: value != null ? new Date().toISOString() : null
    };
    
    updateDebt(accruedEditDebt.id, updates);
    updateDebtAction(accruedEditDebt.id, updates).then((res) => {
      if (!res.success) toast.error("No se pudo guardar: " + res.error);
      else toast.success(value === null ? "Acumulado reseteado a cálculo automático" : "Acumulado actualizado");
    });
    setAccruedEditDebt(null);
  }

  function handleResetAccrued() {
    if (!accruedEditDebt) return;
    
    const updates: Partial<Debt> = { 
      accruedNextCycleOverride: null,
      accruedOverrideDate: null 
    };
    
    updateDebt(accruedEditDebt.id, updates);
    updateDebtAction(accruedEditDebt.id, updates).then((res) => {
      if (!res.success) toast.error("No se pudo resetear: " + res.error);
      else toast.success("Acumulado reseteado a cálculo automático");
    });
    setAccruedEditDebt(null);
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
                    transactions={debtTransactions}
                    onClick={() => handleEdit(debt)}
                    onEdit={() => handleEdit(debt)}
                    onPay={() => handlePay(debt)}
                    onMarkStatementPaid={() => handleMarkStatementPaid(debt)}
                    onEditAccruedNextCycle={() => handleEditAccruedNextCycle(debt)}
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
                    transactions={debtTransactions}
                    onClick={() => handleEdit(debt)}
                    onEdit={() => handleEdit(debt)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <DebtFormModal />

      {/* Payment Modal */}
      <DebtPaymentForm
        debt={paymentDebt}
        open={paymentModalOpen}
        onOpenChange={(open) => {
          setPaymentModalOpen(open);
          if (!open) setPaymentDebt(null);
        }}
      />

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

      {/* Edit Accrued Next Cycle */}
      <AlertDialog open={!!accruedEditDebt} onOpenChange={(open) => !open && setAccruedEditDebt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajuste base del acumulado</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa el monto base (deuda previa no registrada en la app) para &quot;{accruedEditDebt?.name}&quot;. 
              Las compras que registres en la app se sumarán automáticamente a este valor.
              Deja vacío o en 0 si no tienes deuda previa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 2678.71 (vacío = automático)"
              value={accruedEditValue}
              onChange={(e) => setAccruedEditValue(e.target.value)}
              className="text-lg"
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {accruedEditDebt?.accruedNextCycleOverride != null && (
              <Button variant="outline" onClick={handleResetAccrued} className="sm:mr-auto">
                Resetear a automático
              </Button>
            )}
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAccrued}>
              Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
