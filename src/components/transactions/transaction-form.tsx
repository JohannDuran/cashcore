"use client";

import React, { useEffect, useState } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId, formatCurrency } from "@/lib/utils";
import { createTransactionAction, updateTransactionAction, deleteTransactionAction } from "@/app/actions/transaction.actions";
import { createWalletAction } from "@/app/actions/wallet.actions";
import { createCategoryAction } from "@/app/actions/category.actions";
import { createTagAction } from "@/app/actions/tag.actions";
import type { TransactionType, Transaction, WalletType, Currency } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CategoryPicker } from "@/components/shared/category-picker";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { currencies } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

// ── Constants ────────────────────────────────────────────────
const typeLabels: Record<TransactionType, string> = {
  expense: "Gasto", income: "Ingreso", transfer: "Transferencia",
};
const typeColors: Record<TransactionType, string> = {
  expense: "bg-expense/10 text-expense border-expense/30 dark:bg-expense/25 dark:border-expense/60",
  income: "bg-income/10 text-income border-income/30 dark:bg-income/25 dark:border-income/60",
  transfer: "bg-transfer/10 text-transfer border-transfer/30 dark:bg-transfer/25 dark:border-transfer/60",
};
const walletTypes: { value: WalletType; label: string; icon: string }[] = [
  { value: "cash", label: "Efectivo", icon: "Banknote" },
  { value: "bank", label: "Banco", icon: "Building2" },
  { value: "credit", label: "Crédito", icon: "CreditCard" },
  { value: "loan", label: "Préstamo", icon: "Receipt" },
  { value: "ewallet", label: "E-wallet", icon: "Smartphone" },
  { value: "crypto", label: "Crypto", icon: "Bitcoin" },
  { value: "investment", label: "Inversión", icon: "TrendingUp" },
];
const walletColors = [
  "#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#6366F1", "#F97316", "#14B8A6",
];
const categoryColors = [
  "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#64748B",
];
const categoryIcons = [
  "UtensilsCrossed", "Car", "Home", "Gamepad2", "Heart", "GraduationCap",
  "Shirt", "Smartphone", "CreditCard", "Coffee", "ShoppingCart", "Zap",
  "PawPrint", "Gift", "Banknote", "Laptop", "TrendingUp", "Music", "Star",
];

export function TransactionFormModal() {
  const {
    activeModal, setActiveModal, editingItem, setEditingItem,
    wallets, categories, tags, debts,
    addTransaction, updateTransaction, deleteTransaction,
    addWallet, updateWallet, addCategory, updateCategory, addTag, updateDebt,
    user,
  } = useCashCoreStore();

  const isOpen = activeModal === "transaction-form";
  const editTx = editingItem as Transaction | null;
  const isEditing = !!editTx;

  // ── Main form state ──
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [transferToWalletId, setTransferToWalletId] = useState("");
  const [isMsi, setIsMsi] = useState(false);
  const [msiMonths, setMsiMonths] = useState(3);
  const [showNote, setShowNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInsufficientFundsConfirm, setShowInsufficientFundsConfirm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isExternalTransfer, setIsExternalTransfer] = useState(false);
  const [externalRecipient, setExternalRecipient] = useState("");

  // Track latest IDs synchronously to avoid stale closure on submit
  const latestCategoryId = React.useRef("");
  const latestWalletId = React.useRef("");

  // Keep refs in sync with state
  useEffect(() => { latestCategoryId.current = categoryId; }, [categoryId]);
  useEffect(() => { latestWalletId.current = walletId; }, [walletId]);

  // ── Inline wallet creator ──
  const [showNewWallet, setShowNewWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletType, setNewWalletType] = useState<WalletType>("bank");
  const [newWalletColor, setNewWalletColor] = useState("#3B82F6");
  const [newWalletBalance, setNewWalletBalance] = useState("0");
  const [creatingWallet, setCreatingWallet] = useState(false);

  // ── Inline category creator ──
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Star");
  const [newCatColor, setNewCatColor] = useState("#6366F1");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // ── Inline tag creator ──
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [creatingTag, setCreatingTag] = useState(false);

  // ── Validación de fondos en tiempo real ──
  const [fundsError, setFundsError] = useState<string | null>(null);

  // Función para validar fondos disponibles
  const validateFunds = React.useCallback((currentAmount: string, currentWalletId: string, currentType: TransactionType) => {
    if (currentType === "income") {
      setFundsError(null);
      return;
    }
    
    const numAmount = parseFloat(currentAmount);
    if (!numAmount || numAmount <= 0 || !currentWalletId) {
      setFundsError(null);
      return;
    }

    const sourceWallet = wallets.find((w) => w.id === currentWalletId);
    const sourceDebt = debts.find((d) => d.id === currentWalletId);

    if (sourceWallet) {
      if (sourceWallet.balance < numAmount) {
        setFundsError(`Fondos insuficientes. Disponible: ${formatCurrency(sourceWallet.balance, sourceWallet.currency)}`);
      } else {
        setFundsError(null);
      }
    } else if (sourceDebt) {
      const creditAvailable = sourceDebt.originalAmount - sourceDebt.currentBalance;
      if (creditAvailable <= 0) {
        setFundsError(`Sin crédito disponible. Límite alcanzado.`);
      } else if (numAmount > creditAvailable) {
        setFundsError(`Crédito insuficiente. Disponible: ${formatCurrency(creditAvailable, sourceDebt.currency)}`);
      } else {
        setFundsError(null);
      }
    } else {
      setFundsError(null);
    }
  }, [wallets, debts]);

  // Validar cuando cambia el monto, wallet o tipo
  useEffect(() => {
    validateFunds(amount, walletId, type);
  }, [amount, walletId, type, validateFunds]);

  useEffect(() => {
    if (editTx) {
      setType(editTx.type);
      setAmount(editTx.amount?.toString() || "");
      // El walletId puede venir de walletId (wallet) o debtId (tarjeta de crédito)
      const sourceId = editTx.walletId || editTx.debtId || "";
      setWalletId(sourceId);
      latestWalletId.current = sourceId;
      setCategoryId(editTx.categoryId || "");
      latestCategoryId.current = editTx.categoryId || "";
      setDescription(editTx.description || "");
      setNote(editTx.note || "");
      // Asegurar que la fecha tenga el formato correcto YYYY-MM-DD
      const dateValue = editTx.date ? 
        (typeof editTx.date === 'string' && editTx.date.includes('T') 
          ? editTx.date.split('T')[0] 
          : editTx.date) 
        : new Date().toISOString().split("T")[0];
      setDate(dateValue);
      setIsRecurring(editTx.isRecurring);
      setFrequency(editTx.recurringRule?.frequency || "monthly");
      // MSI: hidratar desde la transacción existente
      setIsMsi(!!editTx.msiMonths && editTx.msiMonths > 1);
      setMsiMonths(editTx.msiMonths && editTx.msiMonths > 1 ? editTx.msiMonths : 3);
      // Para transferencias, el destino puede ser un wallet o una deuda
      // El dropdown "Destino" usa transferToWalletId como estado, pero necesitamos cargar
      // tanto transferToWalletId como transferToDebtId dependiendo del caso
      const transferDestination = editTx.transferToWalletId || editTx.transferToDebtId || "";
      setTransferToWalletId(transferDestination);
      // Cargar datos de transferencia externa
      setIsExternalTransfer(!!editTx.externalRecipient);
      setExternalRecipient(editTx.externalRecipient || "");
      setShowNote(!!editTx.note);
      // editTx.tags puede venir como string[] (IDs) o como objetos {id, name,...} según
      // el origen de los datos. Normalizamos SIEMPRE a IDs string para no mandar objetos
      // al backend (que provocaba "Etiquetas no encontradas o no autorizadas").
      setSelectedTagIds(
        Array.isArray(editTx.tags)
          ? editTx.tags
              .map((t: unknown) =>
                typeof t === "string" ? t : (t && typeof t === "object" && "id" in t ? String((t as { id: unknown }).id) : "")
              )
              .filter((id): id is string => !!id)
          : []
      );
    } else {
      resetForm();
    }
  }, [editTx]);

  function resetForm() {
    setType("expense"); setAmount("");
    const defaultWalletId = wallets[0]?.id || "";
    setWalletId(defaultWalletId);
    latestWalletId.current = defaultWalletId;
    setCategoryId("");
    latestCategoryId.current = "";
    setDescription(""); setNote("");
    setDate(new Date().toISOString().split("T")[0]);
    setIsRecurring(false); setFrequency("monthly");
    setIsMsi(false); setMsiMonths(3);
    setTransferToWalletId(""); setShowNote(false); setSelectedTagIds([]);
    setIsExternalTransfer(false); setExternalRecipient("");
    setShowNewWallet(false); setShowNewCategory(false); setShowNewTag(false);
  }

  function handleClose() {
    setActiveModal(null); setEditingItem(null);
    setShowDeleteConfirm(false); setShowInsufficientFundsConfirm(false); resetForm();
  }

  function handleDelete() {
    if (!editTx) return;
    deleteTransaction(editTx.id);
    toast.success("Transacción eliminada");
    deleteTransactionAction(editTx.id).catch(() => toast.error("Error al eliminar en la nube"));
    handleClose();
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleCreateWallet() {
    if (!newWalletName.trim()) return;
    setCreatingWallet(true);
    const walletIcon = walletTypes.find((t) => t.value === newWalletType)?.icon || "Building2";
    const walletData = {
      userId: user?.id || "",
      name: newWalletName.trim(), type: newWalletType,
      currency: (wallets[0]?.currency || "MXN") as Currency,
      balance: parseFloat(newWalletBalance) || 0,
      icon: walletIcon, color: newWalletColor,
      isArchived: false, sortOrder: wallets.length,
      interestEnabled: false, interestRate: null, interestStartDate: null,
    };
    setShowNewWallet(false);
    setNewWalletName(""); setNewWalletBalance("0"); setNewWalletColor("#3B82F6");

    const res = await createWalletAction(walletData as any);
    if (!res.success || !res.data) {
      toast.error("Error al crear wallet: " + res.error);
    } else {
      addWallet({ ...walletData, id: res.data.id });
      setWalletId(res.data.id);
      latestWalletId.current = res.data.id;
      toast.success("Wallet creado y seleccionado");
    }
    setCreatingWallet(false);
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCategory(true);
    const catType = type === "income" ? "income" : "expense";
    const savedName = newCatName.trim();
    const savedIcon = newCatIcon;
    const savedColor = newCatColor;
    setShowNewCategory(false);
    setNewCatName(""); setNewCatIcon("Star"); setNewCatColor("#6366F1");

    const res = await createCategoryAction({ name: savedName, icon: savedIcon, color: savedColor, type: catType });
    if (res.success && res.data) {
      addCategory({ ...res.data, isDefault: false } as any);
      setCategoryId(res.data.id);
      latestCategoryId.current = res.data.id;
      toast.success("Categoría creada y seleccionada");
    } else {
      toast.error("Error al crear categoría: " + res.error);
    }
    setCreatingCategory(false);
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    setShowNewTag(false);
    setNewTagName(""); setNewTagColor("#3B82F6");

    const res = await createTagAction({ name: newTagName.trim(), color: newTagColor });
    if (res.success && res.data) {
      addTag({ ...res.data } as any);
      setSelectedTagIds((prev) => [...prev, res.data!.id]);
      toast.success("Tag creada y seleccionada");
    } else {
      toast.error("Error al crear tag: " + res.error);
    }
    setCreatingTag(false);
  }

  const getImpactMessage = () => {
    if (!editTx) return null;
    // El origen puede ser un wallet o una tarjeta/deuda (compra con tarjeta de crédito).
    const originWallet = wallets.find((w) => w.id === editTx.walletId);
    const originDebt = debts.find((d) => d.id === editTx.debtId);
    const originName = originWallet?.name || originDebt?.name || "cuenta desconocida";

    if (editTx.type === "expense") {
      // En una tarjeta/deuda, revertir una compra reduce el saldo pendiente (lo que debes).
      if (originDebt) {
        return `Se reducirán ${formatCurrency(editTx.amount)} del saldo pendiente de ${originName}.`;
      }
      return `Se restaurarán ${formatCurrency(editTx.amount)} al balance de ${originName}.`;
    }
    if (editTx.type === "income") return `Se restarán ${formatCurrency(editTx.amount)} del balance de ${originName}.`;

    // Para transferencias externas
    if (editTx.externalRecipient) {
      return `Se devolverán ${formatCurrency(editTx.amount)} a ${originName}. (Pago a: ${editTx.externalRecipient})`;
    }

    // Para transferencias internas, buscar el destino en wallets o deudas
    const destWallet = wallets.find((w) => w.id === editTx.transferToWalletId);
    const destDebt = debts.find((d) => d.id === editTx.transferToDebtId);
    const destName = destWallet?.name || destDebt?.name || "destino desconocido";

    return `Se devolverán ${formatCurrency(editTx.amount)} a ${originName} y se restarán de ${destName}.`;
  };

  // Función para ejecutar la transacción (usada tanto por submit normal como confirmación)
  function executeTransaction() {
    const currentWalletId = latestWalletId.current || walletId;
    const currentCategoryId = latestCategoryId.current || categoryId;
    const numAmount = parseFloat(amount);

    // Determinar si el destino de la transferencia es un wallet o una deuda
    // Solo aplica si NO es transferencia externa
    const isTransferToDebt = type === "transfer" && !isExternalTransfer && debts.some(d => d.id === transferToWalletId);
    const isTransferToWallet = type === "transfer" && !isExternalTransfer && wallets.some(w => w.id === transferToWalletId);

    // Determinar la moneda - puede venir de wallet o deuda origen
    const sourceWallet = wallets.find((w) => w.id === currentWalletId);
    const sourceDebt = debts.find((d) => d.id === currentWalletId);
    const currency = sourceWallet?.currency || sourceDebt?.currency || "MXN" as const;

    // Si el origen es una tarjeta/deuda, el objeto optimista debe llevar debtId
    // (no walletId) para que la UI refleje de inmediato la compra en la tarjeta.
    // El backend igualmente resuelve el tipo de cuenta a partir del id recibido.
    const isSourceDebt = !!sourceDebt && !sourceWallet;

    const txData = {
      type, amount: numAmount,
      currency,
      walletId: isSourceDebt ? null : currentWalletId,
      debtId: isSourceDebt ? currentWalletId : null,
      userId: user?.id || "",
      categoryId: type === "transfer" ? "cat-transfer" : currentCategoryId,
      description: description || `${typeLabels[type]} - ${new Date(date).toLocaleDateString("es-MX")}`,
      note: note || undefined, date, isRecurring,
      recurringRule: isRecurring ? { frequency, interval: 1 } : undefined,
      tags: selectedTagIds,
      tagIds: selectedTagIds,
      // Para transferencia externa, no enviar destino interno
      // Para transferencia interna, enviar el campo correcto según si el destino es wallet o deuda
      transferToWalletId: isExternalTransfer ? undefined : (isTransferToWallet ? transferToWalletId : undefined),
      transferToDebtId: isExternalTransfer ? undefined : (isTransferToDebt ? transferToWalletId : undefined),
      externalRecipient: isExternalTransfer ? externalRecipient : undefined,
      // MSI: solo para compras (expense) cargadas a una tarjeta/deuda
      msiMonths: (isSourceDebt && type === "expense" && isMsi && msiMonths > 1) ? msiMonths : null,
    };

    if (isEditing && editTx) {
      updateTransaction(editTx.id, txData);
      updateTransactionAction(editTx.id, txData).then((res) => {
        if (!res.success) toast.error("Error al actualizar: " + res.error);
        else toast.success("Transacción actualizada");
      });
    } else {
      const id = generateId();
      addTransaction({ ...txData, id });
      createTransactionAction({ ...txData, id }).then((res) => {
        if (!res.success) toast.error("Error al guardar: " + res.error);
        else toast.success("Transacción registrada");
      });
    }
    handleClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Read from refs to get IDs updated by async create handlers
    const currentWalletId = latestWalletId.current || walletId;
    const currentCategoryId = latestCategoryId.current || categoryId;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { toast.error("Ingresa un monto válido"); return; }
    if (!currentWalletId) { toast.error("Selecciona un wallet"); return; }
    if (type !== "transfer" && !currentCategoryId) { toast.error("Selecciona una categoría"); return; }
    if (type === "transfer" && !isExternalTransfer && !transferToWalletId) { toast.error("Selecciona el wallet destino"); return; }
    if (type === "transfer" && !isExternalTransfer && currentWalletId === transferToWalletId) { toast.error("Los wallets deben ser diferentes"); return; }
    if (type === "transfer" && isExternalTransfer && !externalRecipient.trim()) { toast.error("Ingresa el nombre del destinatario"); return; }

    // Si hay fondos insuficientes, mostrar diálogo de confirmación en lugar de bloquear
    if (fundsError && type !== "income") {
      setShowInsufficientFundsConfirm(true);
      return;
    }

    // Si no hay errores de fondos, ejecutar directamente
    executeTransaction();
  }

  // Calcular el nuevo saldo para mostrar en el diálogo de confirmación
  const getNewBalancePreview = () => {
    const currentWalletId = latestWalletId.current || walletId;
    const numAmount = parseFloat(amount) || 0;
    
    const sourceWallet = wallets.find((w) => w.id === currentWalletId);
    const sourceDebt = debts.find((d) => d.id === currentWalletId);
    
    if (sourceWallet) {
      const newBalance = sourceWallet.balance - numAmount;
      return {
        name: sourceWallet.name,
        currentBalance: sourceWallet.balance,
        newBalance,
        currency: sourceWallet.currency,
        isDebt: false,
      };
    } else if (sourceDebt) {
      const newBalance = sourceDebt.currentBalance + numAmount;
      const creditAvailable = sourceDebt.originalAmount - sourceDebt.currentBalance;
      const exceededBy = numAmount - creditAvailable;
      return {
        name: sourceDebt.name,
        currentBalance: sourceDebt.currentBalance,
        newBalance,
        currency: sourceDebt.currency,
        isDebt: true,
        creditLimit: sourceDebt.originalAmount,
        exceededBy: exceededBy > 0 ? exceededBy : 0,
      };
    }
    return null;
  };

  const activeWallets = wallets.filter((w) => !w.isArchived);
  const creditCardDebts = debts.filter((d) => (d.type === "credit_card" || d.type === "department_store") && d.isActive);
  const filteredCategories = categories.filter((c) => c.type === (type === "income" ? "income" : "expense"));

  // El origen seleccionado es una tarjeta de crédito/departamental → habilita MSI
  const isOriginDebt = creditCardDebts.some((d) => d.id === walletId);
  const msiOptions = [3, 6, 9, 12, 18, 24];

  // Combined accounts: wallets + credit card debts
  const allAccounts = [
    ...activeWallets.map(w => ({
      id: w.id,
      name: w.name,
      color: w.color,
      balance: w.balance,
      currency: w.currency,
      type: 'wallet' as const,
      icon: w.icon,
    })),
    ...creditCardDebts.map(d => ({
      id: d.id,
      name: d.name,
      color: d.color,
      balance: -d.currentBalance, // Negative because it's debt
      currency: d.currency,
      type: 'debt' as const,
      icon: d.icon,
    })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar transacción" : "Nueva transacción"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de esta transacción" : "Registra un nuevo movimiento"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div className="flex gap-2">
            {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId(""); }}
                className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer",
                  type === t ? typeColors[t] : "border-transparent bg-muted text-muted-foreground hover:bg-accent"
                )}>
                {typeLabels[t]}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Monto</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">$</span>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-2xl font-bold h-14 text-right" />
            </div>
          </div>

          {/* Wallet */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>{type === "transfer" ? "Wallet origen" : "Wallet"}</Label>
              <button type="button" onClick={() => setShowNewWallet(!showNewWallet)}
                className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                <Plus className="w-3 h-3" />
                Nueva wallet
                {showNewWallet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Inline wallet form */}
            {showNewWallet && (
              <div className="mb-2 p-3 rounded-xl border border-border bg-muted/30 space-y-3">
                <Input placeholder="Nombre (ej: BBVA Débito)" value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)} className="h-8 text-sm" autoFocus />
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
                  {walletTypes.map((wt) => (
                    <button key={wt.value} type="button" onClick={() => setNewWalletType(wt.value)}
                      className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors cursor-pointer",
                        newWalletType === wt.value ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                      )}>
                      <IconRenderer name={wt.icon} size={14} />
                      <span className="text-[9px]">{wt.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {walletColors.map((c) => (
                      <button key={c} type="button" onClick={() => setNewWalletColor(c)}
                        className={cn("w-5 h-5 rounded-full border-2 cursor-pointer transition-all",
                          newWalletColor === c ? "border-foreground scale-110" : "border-transparent"
                        )} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <Input type="number" placeholder="Balance inicial" value={newWalletBalance}
                    onChange={(e) => setNewWalletBalance(e.target.value)} className="h-7 text-xs w-28" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewWallet(false)}>Cancelar</Button>
                  <Button type="button" size="sm" onClick={handleCreateWallet} disabled={!newWalletName.trim() || creatingWallet}>
                    Crear wallet
                  </Button>
                </div>
              </div>
            )}

            <Select value={walletId} onValueChange={(id) => {
              setWalletId(id);
              latestWalletId.current = id;
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cuenta" />
              </SelectTrigger>
              <SelectContent>
                {activeWallets.length > 0 && (
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Wallets</div>
                )}
                {activeWallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="flex items-center gap-2 w-full">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                      <span className="truncate">{w.name}</span>
                      <span className={cn("ml-auto text-xs font-semibold tabular-nums", w.balance >= 0 ? "text-green-500" : "text-red-500")}>
                        {formatCurrency(w.balance, w.currency)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                {creditCardDebts.length > 0 && type !== "income" && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Tarjetas de Crédito / Departamentales</div>
                    {creditCardDebts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2 w-full">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="truncate">{d.name}</span>
                          <span className="ml-auto text-xs font-semibold tabular-nums text-red-500">
                            -{formatCurrency(d.currentBalance, d.currency)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {/* Mensaje de error de fondos insuficientes */}
            {fundsError && type !== "income" && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {fundsError}
              </p>
            )}
          </div>

          {/* Meses sin intereses — solo para compras cargadas a tarjeta de crédito/departamental */}
          {type === "expense" && isOriginDebt && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="cursor-pointer" onClick={() => setIsMsi(!isMsi)}>
                    Meses sin intereses (MSI)
                  </Label>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Difiere la compra en mensualidades iguales sin interés
                  </p>
                </div>
                <Switch checked={isMsi} onCheckedChange={setIsMsi} />
              </div>
              {isMsi && (
                <div>
                  <Label>Número de meses</Label>
                  <Select value={String(msiMonths)} onValueChange={(v) => setMsiMonths(parseInt(v, 10))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {msiOptions.map((m) => (
                        <SelectItem key={m} value={String(m)}>{m} meses</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parseFloat(amount) > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Mensualidad: {formatCurrency(parseFloat(amount) / msiMonths)} · {msiMonths} pagos.
                      El saldo total de la tarjeta sube el monto completo; el acumulado por corte refleja solo la mensualidad.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {type === "transfer" && (
            <div className="space-y-3">
              <Label>Tipo de destino</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsExternalTransfer(false); setExternalRecipient(""); }}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer",
                    !isExternalTransfer
                      ? "border-transfer bg-transfer/10 text-transfer"
                      : "border-transparent bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  Cuenta propia / Deuda
                </button>
                <button
                  type="button"
                  onClick={() => { setIsExternalTransfer(true); setTransferToWalletId(""); }}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer",
                    isExternalTransfer
                      ? "border-transfer bg-transfer/10 text-transfer"
                      : "border-transparent bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  Pago a tercero
                </button>
              </div>

              {isExternalTransfer ? (
                <div>
                  <Label htmlFor="externalRecipient">Nombre del destinatario</Label>
                  <Input
                    id="externalRecipient"
                    placeholder="Ej: Juan Pérez, Restaurante ABC..."
                    value={externalRecipient}
                    onChange={(e) => setExternalRecipient(e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label>Destino</Label>
                  <Select value={transferToWalletId} onValueChange={setTransferToWalletId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Deudas primero */}
                      {debts.filter((d) => d.isActive && d.id !== walletId).length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Deudas</div>
                      )}
                      {debts.filter((d) => d.isActive && d.id !== walletId).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-2 w-full">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="truncate">{d.name}</span>
                            <span className="ml-auto text-xs font-semibold tabular-nums text-red-500">
                              -{formatCurrency(d.currentBalance, d.currency)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                      {/* Wallets después */}
                      {activeWallets.filter((w) => w.id !== walletId).length > 0 && (
                        <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", debts.filter((d) => d.isActive && d.id !== walletId).length > 0 && "border-t mt-1 pt-2")}>Wallets</div>
                      )}
                      {activeWallets.filter((w) => w.id !== walletId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="flex items-center gap-2 w-full">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                            <span className="truncate">{w.name}</span>
                            <span className={cn("ml-auto text-xs font-semibold tabular-nums", w.balance >= 0 ? "text-green-500" : "text-red-500")}>
                              {formatCurrency(w.balance, w.currency)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Category */}
          {type !== "transfer" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Categoría</Label>
                <button type="button" onClick={() => setShowNewCategory(!showNewCategory)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  <Plus className="w-3 h-3" />
                  Nueva categoría
                  {showNewCategory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Inline category form */}
              {showNewCategory && (
                <div className="mb-2 p-3 rounded-xl border border-border bg-muted/30 space-y-3">
                  <Input placeholder="Nombre (ej: Mascotas)" value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)} className="h-8 text-sm" autoFocus />
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Icono</p>
                    <div className="flex flex-wrap gap-1">
                      {categoryIcons.map((ic) => (
                        <button key={ic} type="button" onClick={() => setNewCatIcon(ic)}
                          className={cn("w-7 h-7 rounded-lg flex items-center justify-center border cursor-pointer transition-colors",
                            newCatIcon === ic ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                          )}>
                          <IconRenderer name={ic} size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {categoryColors.map((c) => (
                        <button key={c} type="button" onClick={() => setNewCatColor(c)}
                          className={cn("w-5 h-5 rounded-full border-2 cursor-pointer transition-all",
                            newCatColor === c ? "border-foreground scale-110" : "border-transparent"
                          )} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${newCatColor}20` }}>
                        <IconRenderer name={newCatIcon} size={12} style={{ color: newCatColor }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{newCatName || "Vista previa"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCategory(false)}>Cancelar</Button>
                    <Button type="button" size="sm" onClick={handleCreateCategory} disabled={!newCatName.trim() || creatingCategory}>
                      Crear categoría
                    </Button>
                  </div>
                </div>
              )}

              <CategoryPicker categories={filteredCategories} selectedId={categoryId} onSelect={(id) => {
                setCategoryId(id);
                latestCategoryId.current = id;
              }} />
            </div>
          )}

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tags</Label>
              <button type="button" onClick={() => setShowNewTag(!showNewTag)}
                className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                <Plus className="w-3 h-3" />
                Nueva tag
                {showNewTag ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showNewTag && (
              <div className="mb-2 p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                <Input placeholder="Nombre (ej: urgente)" value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)} className="h-8 text-sm" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()} />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {walletColors.map((c) => (
                      <button key={c} type="button" onClick={() => setNewTagColor(c)}
                        className={cn("w-5 h-5 rounded-full border-2 cursor-pointer transition-all",
                          newTagColor === c ? "border-foreground scale-110" : "border-transparent"
                        )} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewTag(false)}>Cancelar</Button>
                    <Button type="button" size="sm" onClick={handleCreateTag} disabled={!newTagName.trim() || creatingTag}>
                      Crear
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && !showNewTag && (
                <p className="text-xs text-muted-foreground">Sin tags. Crea una con el botón de arriba.</p>
              )}
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all cursor-pointer",
                      selected ? "border-transparent text-white" : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                    style={selected ? { backgroundColor: tag.color } : {}}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selected ? "white" : tag.color }} />
                    #{tag.name}
                    {selected && <X className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" placeholder="Ej: Despensa semanal" value={description}
              onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Fecha</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>

          {/* Note */}
          {!showNote ? (
            <button type="button" onClick={() => setShowNote(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              + Agregar nota
            </button>
          ) : (
            <div>
              <Label htmlFor="note">Nota</Label>
              <Textarea id="note" placeholder="Nota adicional..." value={note}
                onChange={(e) => setNote(e.target.value)} className="mt-1" rows={2} />
            </div>
          )}

          {/* Recurring */}
          {type !== "transfer" && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Recurrente</Label>
                <p className="text-xs text-muted-foreground">Se repite automáticamente</p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          )}
          {isRecurring && type !== "transfer" && (
            <div>
              <Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEditing && (
              <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="px-3 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">{isEditing ? "Guardar cambios" : "Crear"}</Button>
          </div>
        </form>
      </DialogContent>

      {isEditing && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.<br />
                <span className="font-medium text-foreground mt-2 block">{getImpactMessage()}</span>
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

      {/* Diálogo de confirmación para fondos insuficientes */}
      <AlertDialog open={showInsufficientFundsConfirm} onOpenChange={setShowInsufficientFundsConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Fondos insuficientes
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  {fundsError}
                </p>
                {(() => {
                  const preview = getNewBalancePreview();
                  if (!preview) return null;
                  return (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {preview.isDebt ? "Esto excederá tu límite de crédito:" : "El saldo quedará en negativo:"}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{preview.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={preview.isDebt ? "text-red-500" : "text-foreground"}>
                            {preview.isDebt ? `-${formatCurrency(preview.currentBalance, preview.currency)}` : formatCurrency(preview.currentBalance, preview.currency)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold text-red-600">
                            {preview.isDebt ? `-${formatCurrency(preview.newBalance, preview.currency)}` : formatCurrency(preview.newBalance, preview.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  ⚠️ Continuar podría descuadrar tus finanzas. ¿Deseas proceder de todos modos?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowInsufficientFundsConfirm(false);
                executeTransaction();
              }} 
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Continuar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
