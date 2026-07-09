"use client";

import { useState } from "react";
import { useCashCoreStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { createCategoryAction, deleteCategoryAction } from "@/app/actions/category.actions";
import { cn } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";

const ICON_OPTIONS = [
  "UtensilsCrossed", "Car", "Home", "Gamepad2", "Heart", "GraduationCap",
  "Shirt", "Smartphone", "CreditCard", "Coffee", "ShoppingCart", "Zap",
  "PawPrint", "Gift", "MoreHorizontal", "Banknote", "Laptop", "TrendingUp",
  "Store", "RotateCcw", "Plus", "Music", "Plane", "Dumbbell", "BookOpen",
  "Camera", "Wrench", "Briefcase", "Globe", "Star",
];

const COLOR_OPTIONS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#22C55E", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#64748B",
];

export function CategoryManagerCard() {
  const { categories, addCategory, deleteCategory, user } = useCashCoreStore();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Star");
  const [color, setColor] = useState("#6366F1");
  const [loading, setLoading] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  function resetForm() {
    setName("");
    setIcon("Star");
    setColor("#6366F1");
    setShowForm(false);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Ingresa un nombre para la categoría");
      return;
    }
    setLoading(true);
    addCategory({ name: name.trim(), icon, color, type: formType, isDefault: false, userId: user?.id });
    resetForm();

    const res = await createCategoryAction({ name: name.trim(), icon, color, type: formType });
    if (!res.success) toast.error("Error al guardar: " + res.error);
    else toast.success("Categoría creada");
    setLoading(false);
  }

  async function handleDelete(cat: Category) {
    if (cat.isDefault) {
      toast.error("No puedes eliminar categorías predeterminadas");
      return;
    }
    deleteCategory(cat.id);
    const res = await deleteCategoryAction(cat.id);
    if (!res.success) toast.error("Error al eliminar: " + res.error);
    else toast.success("Categoría eliminada");
  }

  function CategoryRow({ cat }: { cat: Category }) {
    return (
      <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 group">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cat.color}20` }}
        >
          <IconRenderer name={cat.icon} size={13} style={{ color: cat.color }} />
        </div>
        <span className="text-sm flex-1 truncate">{cat.name}</span>
        {cat.isDefault ? (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            predeterminada
          </span>
        ) : (
          <button
            onClick={() => handleDelete(cat)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Categorías</CardTitle>
            <CardDescription>{categories.length} categorías configuradas</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Cancelar" : "Nueva"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Form */}
        {showForm && (
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input
                  placeholder="Ej: Mascotas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <div className="flex gap-1.5 mt-1">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={cn(
                        "flex-1 h-8 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                        formType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {t === "expense" ? "Gasto" : "Ingreso"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Icono</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer",
                      icon === ic ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                    )}
                  >
                    <IconRenderer name={ic} size={14} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all cursor-pointer",
                      color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <IconRenderer name={icon} size={13} style={{ color }} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{name || "Vista previa"}</span>
              </div>
              <Button size="sm" onClick={handleCreate} disabled={loading}>
                Crear categoría
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="expense">
          <TabsList className="w-full">
            <TabsTrigger value="expense" className="flex-1">
              Gastos ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income" className="flex-1">
              Ingresos ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
              {expenseCategories.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
            </div>
          </TabsContent>
          <TabsContent value="income" className="mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
              {incomeCategories.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
            </div>
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}
