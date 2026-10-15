"use client";

import { useState, useEffect, useCallback } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId } from "@/lib/utils";
import type { DebtType, Debt, Currency } from "@/types";
import { createDebtAction, updateDebtAction, deleteDebtAction } from "@/app/actions/debt.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { IconRenderer } from "@/components/shared/icon-renderer";
import { currencies, debtTypeLabels, debtTypeIcons } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const debtTypes: { value: DebtType; label: string; icon: string }[] = [
  { value: "credit_card", label: "Tarjeta de Crédito", icon: "CreditCard" },
  { value: "personal_credit", label: "Crédito Personal", icon: "Banknote" },
  { value: "personal_loan", label: "Préstamo Personal", icon: "HandCoins" },
  { value: "department_store", label: "Tarjeta Departamental", icon: "ShoppingBag" },
  { value: "mortgage", label: "Hipoteca", icon: "Home" },
  { value: "car_loan", label: "Crédito Automotriz", icon: "Car" },
  { value: "other", label: "Otro", icon: "CircleDollarSign" },
];

const debtColors = [
  "#EF4444", "#F97316", "#F59E0B", "#EC4899", "#A855F7",
  "#6366F1", "#3B82F6", "#06B6D4", "#14B8A6", "#22C55E",
];

export function DebtFormModal() {
  const { 
    activeModal, 
    setActiveModal, 
    editingItem, 
    setEditingItem, 
    addDebt, 
    updateDebt,
    deleteDebt,
    user 
  } = useCashCoreStore();

  const isOpen = activeModal === "debt-form";
  const editDebt = editingItem as Debt | null;
  const isEditing = !!editDebt && "type" in editDebt && "originalAmount" in editDebt && "currentBalance" in editDebt;

  const [name, setName] = useState("");
  const [type, setType] = useState<DebtType>("credit_card");
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [originalAmount, setOriginalAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [icon, setIcon] = useState("CreditCard");
  const [color, setColor] = useState("#EF4444");
  const [notes, setNotes] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setType("credit_card");
    setCurrency("MXN");
    setOriginalAmount("");
    setCurrentBalance("");
    setInterestRate("");
    setMinimumPayment("");
    setPaymentDueDay("");
    setNextPaymentDate("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setIcon("CreditCard");
    setColor("#EF4444");
    setNotes("");
  }, []);

  useEffect(() => {
    if (isEditing && editDebt) {
      setName(editDebt.name);
      setType(editDebt.type);
      setCurrency(editDebt.currency);
      setOriginalAmount(editDebt.originalAmount.toString());
      setCurrentBalance(editDebt.currentBalance.toString());
      setInterestRate(editDebt.interestRate?.toString() || "");
      setMinimumPayment(editDebt.minimumPayment?.toString() || "");
      setPaymentDueDay(editDebt.paymentDueDay?.toString() || "");
      setNextPaymentDate(editDebt.nextPaymentDate?.toString().split("T")[0] || "");
      setStartDate(editDebt.startDate?.toString().split("T")[0] || "");
      setEndDate(editDebt.endDate?.toString().split("T")[0] || "");
      setIcon(editDebt.icon);
      setColor(editDebt.color);
      setNotes(editDebt.notes || "");
    } else {
      resetForm();
    }
  }, [editDebt, isEditing, resetForm]);

  function handleClose() {
    setActiveModal(null);
    setEditingItem(null);
    setShowDeleteConfirm(false);
    resetForm();
  }

  function handleDelete() {
    if (!editDebt) return;
    deleteDebt(editDebt.id);
    toast.success("Deuda eliminada");
    deleteDebtAction(editDebt.id).catch((err) => {
      console.error(err);
      toast.error("Error al eliminar en la nube");
    });
    handleClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa un nombre");
      return;
    }
    if (!originalAmount || parseFloat(originalAmount) <= 0) {
      toast.error("Ingresa un monto original válido");
      return;
    }
    if (!startDate) {
      toast.error("Ingresa la fecha de inicio");
      return;
    }

    const parsedOriginalAmount = parseFloat(originalAmount);
    const parsedCurrentBalance = parseFloat(currentBalance) || parsedOriginalAmount;
    const parsedInterestRate = interestRate ? parseFloat(interestRate) : null;
    const parsedMinimumPayment = minimumPayment ? parseFloat(minimumPayment) : null;
    const parsedPaymentDueDay = paymentDueDay ? parseInt(paymentDueDay, 10) : null;

    if (parsedPaymentDueDay && (parsedPaymentDueDay < 1 || parsedPaymentDueDay > 31)) {
      toast.error("El día de pago debe estar entre 1 y 31");
      return;
    }

    const optimisticId = isEditing && editDebt ? editDebt.id : generateId();

    const debtData = {
      id: optimisticId,
      userId: user?.id || "",
      name: name.trim(),
      type,
      currency,
      originalAmount: parsedOriginalAmount,
      currentBalance: parsedCurrentBalance,
      interestRate: parsedInterestRate,
      minimumPayment: parsedMinimumPayment,
      paymentDueDay: parsedPaymentDueDay,
      nextPaymentDate: nextPaymentDate || null,
      startDate,
      endDate: endDate || null,
      icon,
      color,
      isActive: true,
      notes: notes.trim() || null,
    };

    if (isEditing && editDebt) {
      updateDebt(editDebt.id, debtData);
      const res = await updateDebtAction(editDebt.id, debtData);
      if (res.success) {
        toast.success("Deuda actualizada");
      } else {
        toast.error("Falló la actualización: " + res.error);
      }
    } else {
      addDebt(debtData);
      const res = await createDebtAction(debtData);
      if (res.success) {
        toast.success("Deuda creada");
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
          <DialogTitle>{isEditing ? "Editar deuda" : "Nueva deuda"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de esta deuda" : "Agrega una nueva deuda o crédito"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="debt-name">Nombre</Label>
            <Input
              id="debt-name"
              placeholder="Ej: Tarjeta BBVA, Crédito Nómina"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Type */}
          <div>
            <Label>Tipo de deuda</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {debtTypes.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => {
                    setType(dt.value);
                    setIcon(dt.icon);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer text-center",
                    type === dt.value
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted hover:border-border"
                  )}
                >
                  <IconRenderer name={dt.icon} size={20} />
                  <span className="text-[10px] font-medium leading-tight">{dt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="original-amount">Monto original</Label>
              <Input
                id="original-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="50000.00"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="current-balance">Saldo actual</Label>
              <Input
                id="current-balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="35000.00"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Payment details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="interest-rate">Tasa de interés (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="36.00"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="minimum-payment">Pago mínimo</Label>
              <Input
                id="minimum-payment"
                type="number"
                step="0.01"
                min="0"
                placeholder="1500.00"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="payment-due-day">Día de corte</Label>
              <Input
                id="payment-due-day"
                type="number"
                min="1"
                max="31"
                step="1"
                placeholder="15"
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Fecha límite de pago */}
          <div>
            <Label htmlFor="next-payment-date">Próxima fecha límite de pago</Label>
            <Input
              id="next-payment-date"
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Si no se especifica, se calculará automáticamente usando el día de corte
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Fecha de inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date">Fecha de término (opcional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {debtColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all cursor-pointer border-2",
                    color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="debt-notes">Notas (opcional)</Label>
            <Textarea
              id="debt-notes"
              placeholder="Información adicional sobre esta deuda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
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
              {isEditing ? "Guardar" : "Crear deuda"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      {isEditing && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar deuda?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la deuda &quot;{editDebt?.name}&quot; y no se puede deshacer.
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
