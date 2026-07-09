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
  expense: "bg-expense/10 text-expense border-expense/30",
  income: "bg-income/10 text-income border-income/30",
  transfer: "bg-transfer/10 text-transfer border-transfer/30",
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
    wallets, categories, tags,
    addTransaction, updateTransaction, deleteTransaction,
    addWallet, updateWallet, addCategory, updateCategory, addTag,
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
  const [showNote, setShowNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (editTx) {
      setType(editTx.type);
      setAmount(editTx.amount?.toString() || "");
      setWalletId(editTx.walletId || "");
      setCategoryId(editTx.categoryId || "");
      latestWalletId.current = editTx.walletId || "";
      latestCategoryId.current = editTx.categoryId || "";
      setDescription(editTx.description || "");
      setNote(editTx.note || "");
      setDate(editTx.date);
      setIsRecurring(editTx.isRecurring);
      setFrequency(editTx.recurringRule?.frequency || "monthly");
      setTransferToWalletId(editTx.transferToWalletId || "");
      setShowNote(!!editTx.note);
      setSelectedTagIds(editTx.tags || []);
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
    setTransferToWalletId(""); setShowNote(false); setSelectedTagIds([]);
    setShowNewWallet(false); setShowNewCategory(false); setShowNewTag(false);
  }

  function handleClose() {
    setActiveModal(null); setEditingItem(null);
    setShowDeleteConfirm(false); resetForm();
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
    const originWallet = wallets.find((w) => w.id === editTx.walletId);
    if (editTx.type === "expense") return `Se restaurarán ${formatCurrency(editTx.amount)} al balance de ${originWallet?.name}.`;
    if (editTx.type === "income") return `Se restarán ${formatCurrency(editTx.amount)} del balance de ${originWallet?.name}.`;
    const destWallet = wallets.find((w) => w.id === editTx.transferToWalletId);
    return `Se devolverán ${formatCurrency(editTx.amount)} a ${originWallet?.name} y se restarán de ${destWallet?.name}.`;
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Read from refs to get IDs updated by async create handlers
    const currentWalletId = latestWalletId.current || walletId;
    const currentCategoryId = latestCategoryId.current || categoryId;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { toast.error("Ingresa un monto válido"); return; }
    if (!currentWalletId) { toast.error("Selecciona un wallet"); return; }
    if (type !== "transfer" && !currentCategoryId) { toast.error("Selecciona una categoría"); return; }
    if (type === "transfer" && !transferToWalletId) { toast.error("Selecciona el wallet destino"); return; }
    if (type === "transfer" && currentWalletId === transferToWalletId) { toast.error("Los wallets deben ser diferentes"); return; }

    const txData = {
      type, amount: numAmount,
      currency: wallets.find((w) => w.id === currentWalletId)?.currency || "MXN" as const,
      walletId: currentWalletId, userId: user?.id || "",
      categoryId: type === "transfer" ? "cat-transfer" : currentCategoryId,
      description: description || `${typeLabels[type]} - ${new Date(date).toLocaleDateString("es-MX")}`,
      note: note || undefined, date, isRecurring,
      recurringRule: isRecurring ? { frequency, interval: 1 } : undefined,
      tags: selectedTagIds,
      tagIds: selectedTagIds,
      transferToWalletId: type === "transfer" ? transferToWalletId : undefined,
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

  const activeWallets = wallets.filter((w) => !w.isArchived);
  const filteredCategories = categories.filter((c) => c.type === (type === "income" ? "income" : "expense"));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
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
                <SelectValue placeholder="Selecciona wallet" />
              </SelectTrigger>
              <SelectContent>
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
              </SelectContent>
            </Select>
          </div>

          {/* Transfer destination */}
          {type === "transfer" && (
            <div>
              <Label>Wallet destino</Label>
              <Select value={transferToWalletId} onValueChange={setTransferToWalletId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
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
    </Dialog>
  );
}
