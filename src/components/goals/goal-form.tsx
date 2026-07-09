"use client";

import { useState, useEffect } from "react";
import { useCashCoreStore } from "@/store";
import { cn, generateId, formatCurrency } from "@/lib/utils";
import type { GoalType, Goal } from "@/types";
import { createGoalAction, updateGoalAction, deleteGoalAction } from "@/app/actions/goal.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { IconRenderer } from "@/components/shared/icon-renderer";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const goalTypes: { value: GoalType; label: string; icon: string }[] = [
  { value: "savings", label: "Ahorro", icon: "PiggyBank" },
  { value: "debt_payoff", label: "Deuda", icon: "TrendingDown" },
  { value: "emergency", label: "Emergencia", icon: "Shield" },
  { value: "custom", label: "Personal", icon: "Target" },
];

const goalColors = [
  "#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#6366F1", "#F97316", "#14B8A6",
];

export function GoalFormModal() {
  const { 
    activeModal, 
    setActiveModal, 
    editingItem, 
    setEditingItem, 
    addGoal, 
    updateGoal,
    deleteGoal,
    wallets,
    user 
  } = useCashCoreStore();

  const isOpen = activeModal === "goal-form";
  const editGoal = editingItem as Goal | null;
  const isEditing = !!editGoal && "targetAmount" in editGoal;

  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [walletId, setWalletId] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [icon, setIcon] = useState("PiggyBank");
  const [color, setColor] = useState("#3B82F6");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isEditing && editGoal) {
      setName(editGoal.name);
      setType(editGoal.type);
      setTargetAmount(editGoal.targetAmount.toString());
      setCurrentAmount(editGoal.currentAmount.toString());
      setDeadline(editGoal.deadline ? new Date(editGoal.deadline).toISOString().split("T")[0] : "");
      setWalletId(editGoal.walletId || "");
      setIsCompleted(editGoal.isCompleted);
      setIcon(editGoal.icon);
      setColor(editGoal.color);
    } else {
      resetForm();
    }
  }, [editGoal, isEditing]);

  function resetForm() {
    setName("");
    setType("savings");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setWalletId("");
    setIsCompleted(false);
    setIcon("PiggyBank");
    setColor("#3B82F6");
  }

  function handleClose() {
    setActiveModal(null);
    setEditingItem(null);
    setShowDeleteConfirm(false);
    resetForm();
  }

  function handleDelete() {
    if (!editGoal) return;
    deleteGoal(editGoal.id);
    toast.success("Meta eliminada");
    deleteGoalAction(user?.id || "", editGoal.id).catch((err) => {
      console.error(err);
      toast.error("Error al eliminar en la nube");
    });
    handleClose();
  }

  const getImpactMessage = () => {
    return "Se eliminará de forma permanente esta Meta financiera y su historial de avance. Los balances de tus wallets no serán modificados.";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa un nombre para la meta");
      return;
    }
    const numTarget = parseFloat(targetAmount);
    if (!numTarget || numTarget <= 0) {
      toast.error("Ingresa un monto objetivo válido");
      return;
    }

    const optimisticId = isEditing && editGoal ? editGoal.id : generateId();

    const goalData = {
      id: optimisticId,
      userId: user?.id || "",
      name: name.trim(),
      type,
      targetAmount: numTarget,
      currentAmount: parseFloat(currentAmount) || 0,
      deadline: deadline || undefined,
      icon,
      color,
      walletId: walletId || undefined,
      isCompleted,
    };

    if (isEditing && editGoal) {
      updateGoal(editGoal.id, goalData);
      const res = await updateGoalAction(user?.id || "", editGoal.id, goalData);
      if (res.success) {
        toast.success("Meta actualizada");
      } else {
        toast.error("Falló la actualización: " + res.error);
      }
    } else {
      addGoal(goalData);
      const res = await createGoalAction(goalData);
      if (res.success) {
        toast.success("Meta creada");
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
          <DialogTitle>{isEditing ? "Editar meta" : "Nueva meta"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica tu avance o detalles de la meta" : "Agrega un objetivo financiero"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="goal-name">Nombre</Label>
            <Input
              id="goal-name"
              placeholder="Ej: Enganche de auto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Type */}
          <div>
            <Label>Tipo</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {goalTypes.map((gt) => (
                <button
                  key={gt.value}
                  type="button"
                  onClick={() => {
                    setType(gt.value);
                    setIcon(gt.icon);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer text-center",
                    type === gt.value
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted hover:border-border"
                  )}
                >
                  <IconRenderer name={gt.icon} size={18} />
                  <span className="text-[10px] font-medium whitespace-nowrap">{gt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amounts in flex row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-amount">Monto objetivo</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="target-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="50000.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            {isEditing && (
              <div>
                <Label htmlFor="current-amount">Avance actual</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="current-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Deadline */}
          <div>
            <Label htmlFor="goal-deadline">Fecha límite (opcional)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Wallet Link */}
          <div>
            <Label>Wallet asociada (opcional)</Label>
            <Select value={walletId || "none"} onValueChange={(v) => setWalletId(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Ninguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem>
                {wallets.filter((w) => !w.isArchived).map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div>
            <Label>Color de la meta</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {goalColors.map((c) => (
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

          {/* Is Completed toggle */}
          {isEditing && (
             <div className="flex items-center justify-between mt-2 p-3 bg-muted/50 rounded-xl">
               <div>
                 <Label>Meta completada</Label>
                 <p className="text-xs text-muted-foreground">Ocultar de la lista de pendientes</p>
               </div>
               <Switch checked={isCompleted} onCheckedChange={setIsCompleted} />
             </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isEditing && (
              <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="px-3 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? "Guardar" : "Crear meta"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      {isEditing && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y tu información será eliminada. <br />
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
