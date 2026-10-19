"use client";

import React, { useEffect, useState } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId, formatCurrency } from "@/lib/utils";
import { createTransactionAction } from "@/app/actions/transaction.actions";
import type { Debt, Currency } from "@/types";
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
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { toast } from "sonner";
import { CreditCard, AlertCircle, CheckCircle2, Clock } from "lucide-react";

/**
 * Calcula la próxima fecha de pago basado en la configuración
 */
function getNextPaymentDate(debt: Debt): Date | null {
  if (debt.nextPaymentDate) {
    return new Date(debt.nextPaymentDate);
  }
  
  if (debt.paymentDueDay) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let nextDate = new Date(currentYear, currentMonth, debt.paymentDueDay);
    
    if (nextDate < today) {
      nextDate = new Date(currentYear, currentMonth + 1, debt.paymentDueDay);
    }
    
    return nextDate;
  }
  
  return null;
}

/**
 * Verifica si una fecha de pago está a tiempo (antes o igual a la fecha límite)
 */
function isPaymentOnTime(paymentDate: Date, dueDate: Date | null): boolean {
  if (!dueDate) return true; // Si no hay fecha límite, siempre es a tiempo
  
  const payment = new Date(paymentDate);
  const due = new Date(dueDate);
  
  // Normalizar a medianoche para comparar solo fechas
  payment.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  return payment <= due;
}

/**
 * Formatea la fecha de pago
 */
function formatPaymentDueDate(date: Date): string {
  return date.toLocaleDateString("es-MX", { 
    day: "numeric", 
    month: "short",
    year: "numeric"
  });
}

interface DebtPaymentFormProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtPaymentForm({ debt, open, onOpenChange }: DebtPaymentFormProps) {
  const {
    wallets,
    user,
    addTransaction,
    replaceTransactionId,
  } = useCashCoreStore();

  // ── Form state ──
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when debt changes or modal opens
  useEffect(() => {
    if (debt && open) {
      // Pre-fill with minimum payment or empty
      setAmount(debt.minimumPayment?.toString() || "");
      setWalletId(wallets.filter(w => !w.isArchived)[0]?.id || "");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setShowNote(false);
    }
  }, [debt, open, wallets]);

  function handleClose() {
    onOpenChange(false);
    setAmount("");
    setNote("");
    setShowNote(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!debt) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!walletId) {
      toast.error("Selecciona un wallet de origen");
      return;
    }

    // Ya NO bloqueamos pagos mayores al saldo - permite saldo a favor
    // if (numAmount > debt.currentBalance) { ... }

    setIsSubmitting(true);

    try {
      const selectedWallet = wallets.find(w => w.id === walletId);

      // Verificar si el pago está a tiempo
      const paymentDate = new Date(date);
      const dueDate = getNextPaymentDate(debt);
      const paymentOnTime = isPaymentOnTime(paymentDate, dueDate);

      // Create transaction data as TRANSFER (wallet -> debt)
      // Un pago de deuda es una transferencia de dinero desde un wallet hacia la deuda
      const txData = {
        id: generateId(),
        type: "transfer" as const,
        amount: numAmount,
        currency: (selectedWallet?.currency || debt.currency) as Currency,
        walletId,
        userId: user?.id || "",
        categoryId: "cat-transfer", // Categoría especial para transferencias
        transferToDebtId: debt.id, // Destino: la deuda
        description: `Pago de deuda: ${debt.name}`,
        note: note || undefined,
        date,
        isRecurring: false,
        tags: [],
        tagIds: [],
      };

      // Update local state optimistically
      // addTransaction ahora también actualiza el balance de la deuda
      addTransaction(txData);
      
      // Calcular nuevo balance para mostrar en mensajes
      const newBalance = debt.currentBalance - numAmount;

      // Persist to database - el servicio de transacciones actualiza la deuda automáticamente
      const txRes = await createTransactionAction(txData);

      if (!txRes.success) {
        toast.error("Error al registrar la transacción: " + txRes.error);
      } else {
        if (txRes.data?.id) replaceTransactionId(txData.id, txRes.data.id);
        const hasSaldoAFavor = newBalance < 0;
        const isFullyPaid = newBalance <= 0 && newBalance >= 0;
        const meetsMinimum = debt.minimumPayment ? numAmount >= debt.minimumPayment : true;
        
        // Construir mensaje de éxito
        let successMessage = "";
        
        if (hasSaldoAFavor) {
          successMessage = `Pago registrado. Tienes ${formatCurrency(Math.abs(newBalance), debt.currency)} a favor`;
        } else if (isFullyPaid) {
          successMessage = `¡Felicidades! Has pagado completamente "${debt.name}"`;
        } else {
          successMessage = `Pago de ${formatCurrency(numAmount, debt.currency)} registrado`;
        }
        
        // Agregar información sobre estado del pago
        if (!paymentOnTime && dueDate) {
          toast.warning(`${successMessage}. ⚠️ Pago registrado fuera de fecha límite`);
        } else if (meetsMinimum) {
          toast.success(`${successMessage}${debt.minimumPayment ? " ✓ Pago mínimo cumplido" : ""}`);
        } else {
          toast.success(`${successMessage}. ℹ️ Pago menor al mínimo sugerido`);
        }
      }

      handleClose();
    } catch (error) {
      toast.error("Error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeWallets = wallets.filter(w => !w.isArchived);
  const selectedWallet = wallets.find(w => w.id === walletId);
  const numAmount = parseFloat(amount) || 0;
  // Nuevo balance permitiendo negativos
  const newBalance = debt ? debt.currentBalance - numAmount : 0;
  const willBeFullyPaid = debt && numAmount >= debt.currentBalance && debt.currentBalance > 0;
  const willHaveSaldoAFavor = debt && numAmount > debt.currentBalance && debt.currentBalance > 0;
  
  // Calcular estado del pago
  const nextPaymentDue = debt ? getNextPaymentDate(debt) : null;
  const paymentDate = new Date(date);
  const paymentOnTime = isPaymentOnTime(paymentDate, nextPaymentDue);
  const meetsMinimum = debt?.minimumPayment ? numAmount >= debt.minimumPayment : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Registrar pago de deuda
          </DialogTitle>
          <DialogDescription>
            Registra un pago para reducir el saldo de tu deuda
          </DialogDescription>
        </DialogHeader>

        {debt && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Debt info card */}
            <div className="p-4 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${debt.color}15` }}
                >
                  <IconRenderer name={debt.icon} size={20} style={{ color: debt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{debt.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {debt.currentBalance < 0 ? "Saldo a favor: " : "Saldo pendiente: "}
                    <CurrencyDisplay
                      amount={Math.abs(debt.currentBalance)}
                      currency={debt.currency}
                      size="sm"
                      type={debt.currentBalance < 0 ? "income" : "expense"}
                      className="font-medium"
                    />
                  </p>
                </div>
              </div>
              
              {/* Información de pago mínimo y fecha límite */}
              <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                {debt.minimumPayment && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pago mínimo sugerido</span>
                    <CurrencyDisplay
                      amount={debt.minimumPayment}
                      currency={debt.currency}
                      size="sm"
                      className="font-medium"
                    />
                  </div>
                )}
                {nextPaymentDue && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fecha límite de pago</span>
                    <div className="flex items-center gap-1">
                      {!paymentOnTime ? (
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        !paymentOnTime && "text-amber-500"
                      )}>
                        {formatPaymentDueDate(nextPaymentDue)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="payment-amount">Monto a pagar</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  $
                </span>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-2xl font-bold h-14 text-right"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {debt.minimumPayment && !amount && (
                  <button
                    type="button"
                    onClick={() => setAmount(debt.minimumPayment?.toString() || "")}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Pago mínimo ({formatCurrency(debt.minimumPayment, debt.currency)})
                  </button>
                )}
                {debt.currentBalance > 0 && !amount && (
                  <button
                    type="button"
                    onClick={() => setAmount(debt.currentBalance.toString())}
                    className="text-xs text-emerald-600 hover:underline cursor-pointer"
                  >
                    Liquidar total ({formatCurrency(debt.currentBalance, debt.currency)})
                  </button>
                )}
              </div>
            </div>

            {/* Wallet selector */}
            <div>
              <Label>Pagar desde</Label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona wallet" />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2 w-full">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: w.color }}
                        />
                        <span className="truncate">{w.name}</span>
                        <span
                          className={cn(
                            "ml-auto text-xs font-semibold tabular-nums",
                            w.balance >= 0 ? "text-green-500" : "text-red-500"
                          )}
                        >
                          {formatCurrency(w.balance, w.currency)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWallet && numAmount > selectedWallet.balance && (
                <p className="text-xs text-amber-500 mt-1">
                  ⚠️ El wallet no tiene fondos suficientes
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="payment-date">Fecha del pago</Label>
              <Input
                id="payment-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Note (optional) */}
            {!showNote ? (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                + Agregar nota
              </button>
            ) : (
              <div>
                <Label htmlFor="payment-note">Nota</Label>
                <Textarea
                  id="payment-note"
                  placeholder="Nota adicional..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            )}

            {/* Preview */}
            {numAmount > 0 && (
              <div className="space-y-3">
                {/* Estado del pago */}
                <div className={cn(
                  "p-3 rounded-lg border",
                  willHaveSaldoAFavor 
                    ? "bg-blue-500/10 border-blue-500/30" 
                    : willBeFullyPaid 
                      ? "bg-emerald-500/10 border-emerald-500/30" 
                      : "bg-muted/50 border-border"
                )}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {newBalance < 0 ? "Saldo a favor después del pago" : "Nuevo saldo después del pago"}
                    </span>
                    <CurrencyDisplay
                      amount={Math.abs(newBalance)}
                      currency={debt.currency}
                      size="sm"
                      type={newBalance < 0 ? "income" : newBalance > 0 ? "expense" : "neutral"}
                      className="font-semibold"
                    />
                  </div>
                  {willHaveSaldoAFavor && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      💰 Tendrás saldo a favor para el próximo corte
                    </p>
                  )}
                  {willBeFullyPaid && !willHaveSaldoAFavor && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                      🎉 ¡Con este pago liquidarás completamente esta deuda!
                    </p>
                  )}
                </div>

                {/* Indicadores de estado del pago */}
                <div className="flex flex-wrap gap-2">
                  {/* Pago mínimo */}
                  {debt.minimumPayment && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                      meetsMinimum 
                        ? "bg-emerald-500/10 text-emerald-600" 
                        : "bg-amber-500/10 text-amber-600"
                    )}>
                      {meetsMinimum ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {meetsMinimum ? "Cumple pago mínimo" : "Menor al pago mínimo"}
                    </div>
                  )}
                  
                  {/* Fecha de pago */}
                  {nextPaymentDue && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                      paymentOnTime 
                        ? "bg-emerald-500/10 text-emerald-600" 
                        : "bg-amber-500/10 text-amber-600"
                    )}>
                      {paymentOnTime ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {paymentOnTime ? "Pago a tiempo" : "Fuera de fecha límite"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !numAmount || !walletId}
              >
                {isSubmitting ? "Procesando..." : "Registrar pago"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
