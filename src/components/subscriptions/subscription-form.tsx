"use client";

import { useState, useEffect, useCallback } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId } from "@/lib/utils";
import type { BillingCycle, Subscription, Currency } from "@/types";
import { createSubscriptionAction, updateSubscriptionAction, deleteSubscriptionAction } from "@/app/actions/subscription.actions";
import logger from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryPicker } from "@/components/shared/category-picker";
import { SubscriptionIconPicker } from "@/components/subscriptions/subscription-icon-picker";
import { currencies } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { SubscriptionIconOption } from "@/lib/constants/subscription-icons";

const billingCycles: { value: BillingCycle; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
];

const subColors = [
  "#EF4444", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B",
  "#EC4899", "#8B5CF6", "#64748B", "#F97316", "#14B8A6",
];

export function SubscriptionFormModal() {
  const { 
    activeModal, 
    setActiveModal, 
    editingItem, 
    setEditingItem, 
    addSubscription, 
    updateSubscription,
    deleteSubscription,
    categories,
    wallets,
    user 
  } = useCashCoreStore();

  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
  const isOpen = activeModal === "subscription-form";
  const editSub = editingItem as Subscription | null;
  const isEditing = !!editSub && "billingCycle" in editSub;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [categoryId, setCategoryId] = useState("");
  const [nextBillDate, setNextBillDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [icon, setIcon] = useState("CreditCard");
  const [color, setColor] = useState("#EF4444");
  const [platformId, setPlatformId] = useState<string | undefined>(undefined);
  const [isDomiciliado, setIsDomiciliado] = useState(false);
  const [walletId, setWalletId] = useState<string | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Consider only expenses categories for subscriptions
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const resetForm = useCallback(() => {
    setName("");
    setIsNameManuallyEdited(false);
    setAmount("");
    setCurrency("MXN");
    setBillingCycle("monthly");
    setCategoryId("");
    setNextBillDate("");
    setNotes("");
    setIsActive(true);
    setIcon("CreditCard");
    setColor("#EF4444");
    setPlatformId(undefined);
    setIsDomiciliado(false);
    setWalletId(undefined);
  }, []);

  useEffect(() => {
    if (isEditing && editSub) {
      setName(editSub.name);
      setAmount(editSub.amount.toString());
      setCurrency(editSub.currency);
      setBillingCycle(editSub.billingCycle);
      setCategoryId(editSub.categoryId);
      setNextBillDate(editSub.nextBillDate ? new Date(editSub.nextBillDate).toISOString().split("T")[0] : "");
      setNotes(editSub.notes || "");
      setIsActive(editSub.isActive);
      setIcon(editSub.icon);
      setColor(editSub.color);
      setPlatformId(editSub.platformId ?? undefined);
      setIsDomiciliado(editSub.isDomiciliado ?? false);
      setWalletId(editSub.walletId ?? undefined);
    } else {
      resetForm();
    }
  }, [editSub, isEditing, resetForm]);

  function handleClose() {
    setActiveModal(null);
    setEditingItem(null);
    setShowDeleteConfirm(false);
    resetForm();
  }

  function handleDelete() {
    if (!editSub) return;
    deleteSubscription(editSub.id);
    toast.success("Suscripción eliminada");
    deleteSubscriptionAction(user?.id || "", editSub.id).catch((err) => {
      logger.error({ err }, "deleteSubscription failed");
      toast.error("Error al eliminar en la nube");
    });
    handleClose();
  }

  /** Callback del SubscriptionIconPicker */
  function handleIconSelect(option: SubscriptionIconOption) {
    setIcon(option.icon);
    setColor(option.defaultColor);
    setPlatformId(option.id);
    
    // Only change the name if the user hasn't manually edited it yet
    if (!isNameManuallyEdited) {
      setName(option.label);
    }
  }

  const getImpactMessage = () => {
    return "Se eliminará la suscripción de su registro. Esta acción no afecta las transacciones relacionadas que ya hayas ingresado al sistema.";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa el nombre del servicio");
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }
    if (!nextBillDate) {
      toast.error("Selecciona la fecha del próximo cobro");
      return;
    }

    const optimisticId = isEditing && editSub ? editSub.id : generateId();

    const subData = {
      id: optimisticId,
      userId: user?.id || "",
      name: name.trim(),
      amount: numAmount,
      currency,
      billingCycle,
      categoryId,
      nextBillDate: new Date(nextBillDate).toISOString(),
      icon,
      platformId,
      color,
      isActive,
      isDomiciliado,
      walletId: isDomiciliado ? walletId : undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing && editSub) {
      updateSubscription(editSub.id, subData);
      const res = await updateSubscriptionAction(user?.id || "", editSub.id, subData);
      if (res.success) {
        toast.success("Suscripción actualizada");
      } else {
        toast.error("Falló la actualización: " + res.error);
      }
    } else {
      addSubscription(subData);
      const res = await createSubscriptionAction(subData);
      if (res.success) {
        toast.success("Suscripción registrada");
      } else {
        toast.error("Falló la creación: " + res.error);
      }
    }

    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de este servicio" : "Lleva el control de tus pagos recurrentes"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Icono de Plataforma ─────────────────── */}
          <div>
            <Label>Plataforma / Icono</Label>
            <div className="mt-1">
              <SubscriptionIconPicker
                selectedIcon={icon}
                selectedColor={color}
                onSelect={handleIconSelect}
              />
            </div>
          </div>

          {/* Name & Amount Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sub-name">Servicio</Label>
              <Input
                id="sub-name"
                placeholder="Netflix, Spotify..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // As soon as the user types, we "lock" the name from auto-updates
                  setIsNameManuallyEdited(true);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Período de cobro</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billingCycles.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Currency & Cycle Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sub-amount">Monto</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="sub-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="200.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 pr-3"
                />
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="sub-date">Próximo cobro</Label>
            <Input
              id="sub-date"
              type="date"
              value={nextBillDate}
              onChange={(e) => setNextBillDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <Label>Categoría</Label>
            <div className="mt-1">
              <CategoryPicker
                categories={expenseCategories}
                selectedId={categoryId}
                onSelect={(id) => setCategoryId(id)}
              />
            </div>
          </div>

          {/* Identifier Color */}
          <div>
            <Label>Color de etiqueta</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {subColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all cursor-pointer border-2",
                    color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="sub-notes">Notas (Opcional)</Label>
            <Textarea
              id="sub-notes"
              placeholder="Plan familiar, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 resize-none h-16"
            />
          </div>

          {/* Domiciliado (Auto-debit) */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Domiciliado</Label>
                <p className="text-xs text-muted-foreground leading-tight">Se carga automáticamente a una cuenta</p>
              </div>
              <Switch checked={isDomiciliado} onCheckedChange={(checked) => {
                setIsDomiciliado(checked);
                if (!checked) setWalletId(undefined);
              }} />
            </div>
            {isDomiciliado && (
              <div>
                <Label>Cuenta de cargo</Label>
                <Select value={walletId || ""} onValueChange={(v) => setWalletId(v || undefined)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona una wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.filter((w) => !w.isArchived).map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Status */}
          {isEditing && (
            <div className="flex items-center justify-between mt-2 p-3 bg-muted/50 rounded-xl border border-border">
              <div>
                <Label>Suscripción Activa</Label>
                <p className="text-xs text-muted-foreground leading-tight">Mantenlo encendido para rastreo mensual</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border mt-2">
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
              <AlertDialogTitle>¿Eliminar suscripción?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción borrará este servicio de tus próximos pagos. <br />
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
