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
import { Switch } from "@/components/ui/switch";
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

/**
 * Normaliza un valor de fecha (Date | string | null) a formato YYYY-MM-DD
 * para usarlo en un input type="date". Retorna "" si no es válido.
 * Parsea strings YYYY-MM-DD como fecha local (sin desfase UTC).
 */
function toDateInputValue(value: unknown): string {
  if (!value) return "";
  
  const str = String(value);
  
  // Si es formato ISO con T (ej: "2026-10-28T00:00:00.000Z"), extraer solo la fecha
  // y parsear como local para evitar desfase
  if (str.includes('T')) {
    const datePart = str.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (year && month && day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  
  // Si es formato YYYY-MM-DD simple, usarlo directo
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Fallback: parsear como Date y extraer componentes locales
  const date = value instanceof Date ? value : new Date(str);
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calcula la próxima fecha límite de pago (formato YYYY-MM-DD) a partir del día de pago.
 * Usa el día del mes actual si aún no ha pasado; de lo contrario, el mes siguiente.
 * Ajusta el día a meses más cortos (ej. día 31 en febrero).
 */
function computeNextPaymentDate(dueDay: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayFor = (year: number, month: number): Date => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(dueDay, lastDay));
  };

  let next = dayFor(today.getFullYear(), today.getMonth());
  if (next < today) {
    next = dayFor(today.getFullYear(), today.getMonth() + 1);
  }

  // Formatear como YYYY-MM-DD en hora local (sin desfase por UTC)
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
  const [statementDay, setStatementDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [paymentDueMonthOffset, setPaymentDueMonthOffset] = useState("0");
  const [monthlyPaymentEnabled, setMonthlyPaymentEnabled] = useState(false);
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  // Indica si el usuario editó manualmente la próxima fecha límite de pago.
  // Mientras sea false, la fecha se autocalcula desde el día límite de pago.
  const [nextPaymentDateManual, setNextPaymentDateManual] = useState(false);
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
    setStatementDay("");
    setPaymentDueDay("");
    setPaymentDueMonthOffset("0");
    setMonthlyPaymentEnabled(false);
    setNextPaymentDate("");
    setNextPaymentDateManual(false);
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
      setStatementDay(editDebt.statementDay?.toString() || "");
      setPaymentDueDay(editDebt.paymentDueDay?.toString() || "");
      setPaymentDueMonthOffset((editDebt.paymentDueMonthOffset ?? 0).toString());
      setMonthlyPaymentEnabled(editDebt.monthlyPaymentEnabled ?? false);
      const existingNextDate = toDateInputValue(editDebt.nextPaymentDate);
      setNextPaymentDate(existingNextDate);
      // Si ya hay una fecha guardada, se respeta como manual (no se autocalcula al editar)
      setNextPaymentDateManual(!!existingNextDate);
      setStartDate(toDateInputValue(editDebt.startDate) || new Date().toISOString().split("T")[0]);
      setEndDate(toDateInputValue(editDebt.endDate));
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
    // Importante: distinguir "campo vacío" de "0". Antes se usaba `|| parsedOriginalAmount`,
    // que al escribir 0 lo tomaba como falsy y lo reemplazaba por el monto original (bug:
    // una deuda liquidada en 0 se reiniciaba al original). Ahora solo caemos al original
    // si el campo está vacío o no es un número.
    const trimmedBalance = currentBalance.trim();
    const parsedBalanceRaw = parseFloat(trimmedBalance);
    const parsedCurrentBalance =
      trimmedBalance === "" || isNaN(parsedBalanceRaw) ? parsedOriginalAmount : parsedBalanceRaw;
    const parsedInterestRate = interestRate ? parseFloat(interestRate) : null;
    const parsedMinimumPayment = minimumPayment ? parseFloat(minimumPayment) : null;
    const parsedStatementDay = statementDay ? parseInt(statementDay, 10) : null;
    const parsedPaymentDueDay = paymentDueDay ? parseInt(paymentDueDay, 10) : null;

    if (parsedStatementDay && (parsedStatementDay < 1 || parsedStatementDay > 31)) {
      toast.error("El día de corte debe estar entre 1 y 31");
      return;
    }

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
      statementDay: parsedStatementDay,
      paymentDueDay: parsedPaymentDueDay,
      paymentDueMonthOffset: parseInt(paymentDueMonthOffset, 10) || 0,
      monthlyPaymentEnabled,
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
      <DialogContent className="sm:max-w-[520px] max-h-[90dvh] overflow-y-auto">
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
              <Label htmlFor="statement-day">Día de corte</Label>
              <Input
                id="statement-day"
                type="number"
                min="1"
                max="31"
                step="1"
                placeholder="15"
                value={statementDay}
                onChange={(e) => setStatementDay(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Día límite de pago */}
          <div>
            <Label htmlFor="payment-due-day">Día límite de pago</Label>
            <Input
              id="payment-due-day"
              type="number"
              min="1"
              max="31"
              step="1"
              placeholder="5"
              value={paymentDueDay}
              onChange={(e) => setPaymentDueDay(e.target.value)}
              onBlur={() => {
                // Al salir del input, recalcular la próxima fecha límite de pago
                // usando el día ingresado. Cambiar el día de pago siempre "gana"
                // y reinicia el modo manual.
                const day = parseInt(paymentDueDay, 10);
                if (day >= 1 && day <= 31) {
                  setNextPaymentDate(computeNextPaymentDate(day));
                  setNextPaymentDateManual(false);
                }
              }}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Día del mes en que vence el pago del estado de cuenta
            </p>
          </div>

          {/* Pago mínimo mensual por ciclo — para préstamos/créditos (no tarjetas con corte) */}
          {type !== "credit_card" && type !== "department_store" && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="cursor-pointer" onClick={() => setMonthlyPaymentEnabled(!monthlyPaymentEnabled)}>
                    Pago mínimo mensual por ciclo
                  </Label>
                  <p className="text-xs text-muted-foreground leading-tight">
                    El pago mínimo se trata como una mensualidad: disminuye con tus abonos del mes y se reinicia cada ciclo.
                  </p>
                </div>
                <Switch checked={monthlyPaymentEnabled} onCheckedChange={setMonthlyPaymentEnabled} />
              </div>
              {monthlyPaymentEnabled && (!minimumPayment || !paymentDueDay) && (
                <p className="text-[11px] text-amber-500">
                  Para que funcione, configura un <strong>Pago mínimo</strong> y un <strong>Día límite de pago</strong>.
                </p>
              )}
            </div>
          )}

          {/* Mes de vencimiento del pago (offset) */}
          {(type === "credit_card" || type === "department_store") && statementDay && paymentDueDay && (
            <div>
              <Label htmlFor="payment-due-month-offset">¿En qué mes vence el pago?</Label>
              <select
                id="payment-due-month-offset"
                value={paymentDueMonthOffset}
                onChange={(e) => setPaymentDueMonthOffset(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="0">Mismo mes del corte</option>
                <option value="1">Mes siguiente al corte</option>
                <option value="2">Dos meses después del corte</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ejemplo: Si corta el día 8 y pago vence el 28 del mismo mes = "Mismo mes". 
                Si corta el 15 y pago vence el 5 del mes siguiente = "Mes siguiente".
              </p>
            </div>
          )}

          {/* Fecha límite de pago */}
          <div>
            <Label htmlFor="next-payment-date">Próxima fecha límite de pago</Label>
            <Input
              id="next-payment-date"
              type="date"
              value={nextPaymentDate}
              onChange={(e) => {
                setNextPaymentDate(e.target.value);
                // El usuario tomó control manual de la fecha
                setNextPaymentDateManual(true);
              }}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Si no se especifica, se calculará automáticamente usando el día límite de pago
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
