"use client";

import React, { useEffect, useState } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId, formatCurrency } from "@/lib/utils";
import { createTransactionAction } from "@/app/actions/transaction.actions";
import { updateDebtAction } from "@/app/actions/debt.actions";
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
import { CreditCard } from "lucide-react";

interface DebtPaymentFormProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtPaymentForm({ debt, open, onOpenChange }: DebtPaymentFormProps) {
  const {
    wallets,
    categories,
    user,
    addTransaction,
    updateDebt,
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
    if (numAmount > debt.currentBalance) {
      toast.error("El monto no puede ser mayor al saldo pendiente");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedWallet = wallets.find(w => w.id === walletId);
      
      // Find or use a default category for debt payments
      const debtPaymentCategory = categories.find(
        c => c.type === "expense" && (c.name.toLowerCase().includes("deuda") || c.name.toLowerCase().includes("pago"))
      ) || categories.find(c => c.type === "expense");

      if (!debtPaymentCategory) {
        toast.error("No se encontró una categoría para registrar el pago");
        setIsSubmitting(false);
        return;
      }

      // Create transaction data
      const txData = {
        id: generateId(),
        type: "expense" as const,
        amount: numAmount,
        currency: (selectedWallet?.currency || debt.currency) as Currency,
        walletId,
        userId: user?.id || "",
        categoryId: debtPaymentCategory.id,
        description: `Pago de deuda: ${debt.name}`,
        note: note || undefined,
        date,
        isRecurring: false,
        tags: [],
        tagIds: [],
      };

      // Update local state optimistically
      addTransaction(txData);
      
      // Calculate new balance
      const newBalance = Math.max(debt.currentBalance - numAmount, 0);
      updateDebt(debt.id, { currentBalance: newBalance });

      // Persist to database
      const [txRes, debtRes] = await Promise.all([
        createTransactionAction(txData),
        updateDebtAction(debt.id, { currentBalance: newBalance }),
      ]);

      if (!txRes.success) {
        toast.error("Error al registrar la transacción: " + txRes.error);
      } else if (!debtRes.success) {
        toast.error("Error al actualizar la deuda: " + debtRes.error);
      } else {
        const isFullyPaid = newBalance <= 0;
        toast.success(
          isFullyPaid 
            ? `¡Felicidades! Has pagado completamente "${debt.name}"` 
            : `Pago de ${formatCurrency(numAmount, debt.currency)} registrado`
        );
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
  const newBalance = debt ? Math.max(debt.currentBalance - numAmount, 0) : 0;
  const willBeFullyPaid = debt && numAmount >= debt.currentBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
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
                    Saldo pendiente:{" "}
                    <CurrencyDisplay
                      amount={debt.currentBalance}
                      currency={debt.currency}
                      size="sm"
                      type="expense"
                      className="font-medium"
                    />
                  </p>
                </div>
              </div>
              {debt.minimumPayment && (
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Pago mínimo sugerido</span>
                  <CurrencyDisplay
                    amount={debt.minimumPayment}
                    currency={debt.currency}
                    size="sm"
                    className="font-medium"
                  />
                </div>
              )}
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
                  max={debt.currentBalance}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-2xl font-bold h-14 text-right"
                  autoFocus
                />
              </div>
              {debt.minimumPayment && !amount && (
                <button
                  type="button"
                  onClick={() => setAmount(debt.minimumPayment?.toString() || "")}
                  className="text-xs text-primary hover:underline mt-1 cursor-pointer"
                >
                  Usar pago mínimo ({formatCurrency(debt.minimumPayment, debt.currency)})
                </button>
              )}
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
              <div className={cn(
                "p-3 rounded-lg border",
                willBeFullyPaid 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-muted/50 border-border"
              )}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nuevo saldo después del pago</span>
                  <CurrencyDisplay
                    amount={newBalance}
                    currency={debt.currency}
                    size="sm"
                    type={newBalance > 0 ? "expense" : "neutral"}
                    className="font-semibold"
                  />
                </div>
                {willBeFullyPaid && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    🎉 ¡Con este pago liquidarás completamente esta deuda!
                  </p>
                )}
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
