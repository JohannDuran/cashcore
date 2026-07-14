"use client";

import { useState, useEffect } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId } from "@/lib/utils";
import type { BudgetPeriod, Budget } from "@/types";
import { createBudgetAction, updateBudgetAction, deleteBudgetAction } from "@/app/actions/budget.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { CategoryPicker } from "@/components/shared/category-picker";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { toast } from "sonner";
import { Trash2, Wallet as WalletIcon } from "lucide-react";

const periodOptions: { value: BudgetPeriod; label: string; days: number }[] = [
  { value: "weekly", label: "Semanal", days: 7 },
  { value: "biweekly", label: "Catorcenal", days: 14 },
  { value: "quincenal", label: "Quincenal", days: 15 },
  { value: "monthly", label: "Mensual", days: 30 },
  { value: "yearly", label: "Anual", days: 365 },
];

export function BudgetFormModal() {
  const { activeModal, setActiveModal, editingItem, setEditingItem, categories, wallets, addBudget, updateBudget, deleteBudget, user } = useCashCoreStore();

  const isOpen = activeModal === "budget-form";
  const editBudget = editingItem as Budget | null;
  const isEditing = !!editBudget && "period" in editBudget;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [walletIds, setWalletIds] = useState<string[]>([]);
  const [rollover, setRollover] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => getAutoEndDate(new Date().toISOString().split("T")[0], "monthly"));
  const [endDateManuallySet, setEndDateManuallySet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const activeWallets = wallets.filter((w) => !w.isArchived);

  function getAutoEndDate(start: string | Date, prd: BudgetPeriod): string {
    const d = start instanceof Date ? new Date(start) : new Date(start + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    const days = periodOptions.find((p) => p.value === prd)?.days ?? 30;
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  function toDateString(v: string | Date | undefined | null): string {
    if (!v) return new Date().toISOString().split("T")[0];
    if (v instanceof Date) return v.toISOString().split("T")[0];
    return v.split("T")[0];
  }

  useEffect(() => {
    if (!endDateManuallySet) {
      setEndDate(getAutoEndDate(startDate, period));
    }
  }, [startDate, period, endDateManuallySet]);

  useEffect(() => {
    if (isEditing && editBudget) {
      setName(editBudget.name);
      setAmount(editBudget.amount.toString());
      setPeriod(editBudget.period);
      setCategoryIds(editBudget.categoryIds || []);
      setWalletIds(editBudget.walletIds || []);
      setRollover(editBudget.rollover);
      const start = toDateString(editBudget.startDate);
      setStartDate(start);
      const existingEnd = editBudget.endDate
        ? toDateString(editBudget.endDate)
        : getAutoEndDate(start, editBudget.period);
      setEndDate(existingEnd);
      setEndDateManuallySet(!!editBudget.endDate);
    } else {
      resetForm();
    }
  }, [editBudget, isEditing]);

  function resetForm() {
    setName("");
    setAmount("");
    setPeriod("monthly");
    setCategoryIds([]);
    setWalletIds([]);
    setRollover(false);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(getAutoEndDate(new Date().toISOString().split("T")[0], "monthly"));
    setEndDateManuallySet(false);
  }

  function handleClose() {
    setActiveModal(null);
    setEditingItem(null);
    setShowDeleteConfirm(false);
    resetForm();
  }

  function handleDelete() {
    if (!editBudget) return;
    deleteBudget(editBudget.id);
    toast.success("Presupuesto eliminado");
    deleteBudgetAction(user?.id || "", editBudget.id).catch((err) => {
      console.error(err);
      toast.error("Error al eliminar en la nube");
    });
    handleClose();
  }

  const getImpactMessage = () => {
    return "Se eliminará de forma permanente esta planificación de presupuesto e historial de monitoreo. Las transacciones subyacentes NO serán eliminadas.";
  };

  function toggleWallet(id: string) {
    setWalletIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (categoryIds.length === 0) {
      toast.error("Selecciona al menos una categoría");
      return;
    }

    const firstCat = categories.find((c) => c.id === categoryIds[0]);
    const optimisticId = isEditing && editBudget ? editBudget.id : generateId();

    const budgetData = {
      id: optimisticId,
      userId: user?.id || "",
      name: name || (categoryIds.length === 1 && firstCat ? firstCat.name : "Presupuesto"),
      amount: numAmount,
      period,
      categoryIds,
      walletIds,
      startDate,
      endDate,
      rollover,
      isActive: true,
    };

    if (isEditing && editBudget) {
      updateBudget(editBudget.id, budgetData);
      const res = await updateBudgetAction(user?.id || "", editBudget.id, budgetData);
      if (res.success) {
        toast.success("Presupuesto actualizado");
      } else {
        toast.error("Falló la actualización: " + res.error);
      }
    } else {
      addBudget(budgetData);
      const res = await createBudgetAction(budgetData);
      if (res.success) {
        toast.success("Presupuesto creado");
      } else {
        toast.error("Falló la creación: " + res.error);
      }
    }

    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de este presupuesto" : "Fija un límite de gasto por categoría"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="budget-name">Nombre (opcional)</Label>
            <Input
              id="budget-name"
              placeholder="Ej: Alimentación mensual"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Categorías</Label>
              {categoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryIds([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="mt-2">
              <CategoryPicker
                categories={expenseCategories}
                selectedIds={categoryIds}
                onMultiSelect={setCategoryIds}
                type="expense"
              />
            </div>
            {categoryIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {categoryIds.length} categoría{categoryIds.length === 1 ? "" : "s"} seleccionada{categoryIds.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="budget-amount">Monto límite</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <Input
                id="budget-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="5000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <Label>Período</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer",
                    period === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-muted text-muted-foreground hover:border-border"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget-start-date">Inicio del período</Label>
              <Input
                id="budget-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setEndDateManuallySet(false);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="budget-end-date">Fin del período</Label>
              <Input
                id="budget-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setEndDateManuallySet(true);
                }}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Wallets</Label>
              <div className="flex items-center gap-2">
                {walletIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWalletIds([])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ninguna
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWalletIds(activeWallets.map((w) => w.id))}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Todas
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {walletIds.length === 0
                ? "Sin filtro de wallet — aplica a todas"
                : `${walletIds.length} wallet${walletIds.length === 1 ? "" : "s"} seleccionada${walletIds.length === 1 ? "" : "s"}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {activeWallets.map((w) => {
                const selected = walletIds.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWallet(w.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-muted text-muted-foreground hover:border-border"
                    )}
                  >
                    <WalletIcon className="w-3 h-3" />
                    {w.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Rollover</Label>
              <p className="text-xs text-muted-foreground">Arrastra el excedente al siguiente período</p>
            </div>
            <Switch checked={rollover} onCheckedChange={setRollover} />
          </div>

          <div className="flex gap-3 pt-2">
            {isEditing && (
              <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="px-3 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      {isEditing && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible. <br />
                <span className="font-medium text-foreground mt-2 block">
                  {getImpactMessage()}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  );
}
