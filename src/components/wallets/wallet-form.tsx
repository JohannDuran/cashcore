"use client";

import { useState, useEffect, useCallback } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId } from "@/lib/utils";
import type { WalletType, Wallet } from "@/types";
import { createWalletAction, updateWalletAction, deleteWalletAction } from "@/app/actions/wallet.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { currencies } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Currency } from "@/types";
import { Switch } from "@/components/ui/switch";

const walletTypes: { value: WalletType; label: string; icon: string }[] = [
  { value: "cash", label: "Efectivo", icon: "Banknote" },
  { value: "bank", label: "Banco", icon: "Building2" },
  { value: "credit", label: "Crédito", icon: "CreditCard" },
  { value: "loan", label: "Préstamo", icon: "Receipt" },
  { value: "ewallet", label: "E-wallet", icon: "Smartphone" },
  { value: "crypto", label: "Crypto", icon: "Bitcoin" },
  { value: "investment", label: "Inversión", icon: "TrendingUp" },
];

const debtWalletTypes: WalletType[] = ["credit", "loan"];

const walletColors = [
  "#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#6366F1", "#F97316", "#14B8A6",
];

export function WalletFormModal() {
  const { 
    activeModal, 
    setActiveModal, 
    editingItem, 
    setEditingItem, 
    addWallet, 
    updateWallet,
    deleteWallet,
    transactions,
    user 
  } = useCashCoreStore();

  const isOpen = activeModal === "wallet-form";
  const editWallet = editingItem as Wallet | null;
  const isEditing = !!editWallet && "type" in editWallet && "currency" in editWallet && !("categoryId" in editWallet);

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("bank");
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [icon, setIcon] = useState("Building2");
  const [color, setColor] = useState("#3B82F6");
  const [interestEnabled, setInterestEnabled] = useState(false);
  const [interestRate, setInterestRate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setType("bank");
    setCurrency("MXN");
    setBalance("");
    setCreditLimit("");
    setMonthlyPayment("");
    setPaymentDueDay("");
    setIcon("Building2");
    setColor("#3B82F6");
    setInterestEnabled(false);
    setInterestRate("");
  }, []);

  useEffect(() => {
    if (isEditing && editWallet) {
      setName(editWallet.name);
      setType(editWallet.type);
      setCurrency(editWallet.currency);
      setBalance(editWallet.balance.toString());
      setCreditLimit(editWallet.creditLimit?.toString() || "");
      setMonthlyPayment(editWallet.monthlyPayment?.toString() || "");
      setPaymentDueDay(editWallet.paymentDueDay?.toString() || "");
      setIcon(editWallet.icon);
      setColor(editWallet.color);
      setInterestEnabled(editWallet.interestEnabled || false);
      setInterestRate(editWallet.interestRate?.toString() || "");
    } else {
      resetForm();
    }
  }, [editWallet, isEditing, resetForm]);

  function handleClose() {
    setActiveModal(null);
    setEditingItem(null);
    setShowDeleteConfirm(false);
    resetForm();
  }

  function handleDelete() {
    if (!editWallet) return;
    deleteWallet(editWallet.id);
    toast.success("Wallet eliminado");
    deleteWalletAction(user?.id || "", editWallet.id).catch((err) => {
      console.error(err);
      toast.error("Error al eliminar en la nube");
    });
    handleClose();
  }

  const getImpactMessage = () => {
    if (!editWallet) return null;
    const txCount = transactions.filter(t => t.walletId === editWallet.id).length;
    return `Se eliminará de forma permanente esta cuenta y las ${txCount} transacciones asociadas a ella. Los balances globales se re-calcularán sin esta cuenta.`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa un nombre");
      return;
    }

    const optimisticId = isEditing && editWallet ? editWallet.id : generateId();
    const isDebtType = debtWalletTypes.includes(type);
    const parsedCreditLimit = parseFloat(creditLimit);
    const parsedMonthlyPayment = parseFloat(monthlyPayment);
    const parsedPaymentDueDay = parseInt(paymentDueDay, 10);
    const normalizedCreditLimit =
      type === "credit" && creditLimit.trim() ? parsedCreditLimit : null;
    const normalizedMonthlyPayment =
      isDebtType && monthlyPayment.trim() ? parsedMonthlyPayment : null;
    const normalizedPaymentDueDay =
      isDebtType && paymentDueDay.trim() ? parsedPaymentDueDay : null;

    if (
      type === "credit" &&
      creditLimit.trim() &&
      (Number.isNaN(parsedCreditLimit) || parsedCreditLimit < 0)
    ) {
      toast.error("Ingresa un límite de crédito válido");
      return;
    }

    if (
      isDebtType &&
      monthlyPayment.trim() &&
      (Number.isNaN(parsedMonthlyPayment) || parsedMonthlyPayment < 0)
    ) {
      toast.error("Ingresa un pago mensual válido");
      return;
    }

    if (
      isDebtType &&
      paymentDueDay.trim() &&
      (
        Number.isNaN(parsedPaymentDueDay) ||
        parsedPaymentDueDay < 1 ||
        parsedPaymentDueDay > 31
      )
    ) {
      toast.error("El día límite de pago debe estar entre 1 y 31");
      return;
    }

    const walletData = {
      id: optimisticId,
      userId: user?.id || "",
      name: name.trim(),
      type,
      currency,
      balance: parseFloat(balance) || 0,
      creditLimit: normalizedCreditLimit,
      monthlyPayment: isDebtType ? normalizedMonthlyPayment : null,
      paymentDueDay: isDebtType ? normalizedPaymentDueDay : null,
      icon,
      color,
      isArchived: false,
      sortOrder: 0,
      interestEnabled,
      interestRate: interestEnabled ? (parseFloat(interestRate) || null) : null,
      interestStartDate: interestEnabled
        ? (editWallet?.interestEnabled && editWallet?.interestStartDate
            ? editWallet.interestStartDate
            : new Date())
        : null,
    };

    if (isEditing && editWallet) {
      updateWallet(editWallet.id, walletData);
      const res = await updateWalletAction(user?.id || "", editWallet.id, walletData);
      if (res.success) {
        toast.success("Wallet actualizado");
      } else {
        toast.error("Falló la actualización: " + res.error);
      }
    } else {
      addWallet(walletData);
      const res = await createWalletAction(walletData);
      if (res.success) {
        toast.success("Wallet creado");
      } else {
        toast.error("Falló la creación: " + res.error);
      }
    }

    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar wallet" : "Nuevo wallet"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de este wallet" : "Agrega una nueva cuenta o billetera"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="wallet-name">Nombre</Label>
            <Input
              id="wallet-name"
              placeholder="Ej: BBVA Débito"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Type */}
          <div>
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-2">
              {walletTypes.map((wt) => (
                <button
                  key={wt.value}
                  type="button"
                  onClick={() => {
                    setType(wt.value);
                    setIcon(wt.icon);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer text-center",
                    type === wt.value
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted hover:border-border"
                  )}
                >
                  <IconRenderer name={wt.icon} size={20} />
                  <span className="text-[10px] font-medium">{wt.label}</span>
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

          {/* Balance */}
          <div>
            <Label htmlFor="wallet-balance">
              {debtWalletTypes.includes(type)
                ? "Saldo actual (negativo si debes)"
                : `Balance ${isEditing ? "actual" : "inicial"}`}
            </Label>
            <Input
              id="wallet-balance"
              type="number"
              step="0.01"
              placeholder={debtWalletTypes.includes(type) ? "-5000.00" : "0.00"}
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Debt Details */}
          {debtWalletTypes.includes(type) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {type === "credit" && (
                <div>
                  <Label htmlFor="credit-limit">Límite de crédito</Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="15000.00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="monthly-payment">Pago mensual</Label>
                <Input
                  id="monthly-payment"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1200.00"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className={type === "credit" ? "sm:col-span-2" : undefined}>
                <Label htmlFor="payment-due-day">Día límite de pago</Label>
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
          )}

          {/* Color */}
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {walletColors.map((c) => (
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

          {/* Interest */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer" onClick={() => setInterestEnabled(!interestEnabled)}>
                  Interés anual
                </Label>
                <p className="text-xs text-muted-foreground">
                  Calcula el rendimiento proyectado automáticamente
                </p>
              </div>
              <Switch
                checked={interestEnabled}
                onCheckedChange={setInterestEnabled}
              />
            </div>
            {interestEnabled && (
              <div>
                <Label htmlFor="interest-rate">Tasa de interés anual (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="15.00"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
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
              {isEditing ? "Guardar" : "Crear wallet"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      {isEditing && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar wallet?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y afectará a tu información. <br />
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
