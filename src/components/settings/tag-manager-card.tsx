"use client";

import { useState } from "react";
import { useCashCoreStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTagAction, updateTagAction, deleteTagAction } from "@/app/actions/tag.actions";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Tag } from "@/types";

const COLOR_OPTIONS = [
  "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#64748B",
];

export function TagManagerCard() {
  const { tags, addTag, updateTag, deleteTag } = useCashCoreStore();

  // New tag form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    const optimisticId = generateId();
    addTag({ name: newName.trim(), color: newColor, userId: "" });
    setNewName("");
    setNewColor("#3B82F6");
    setShowForm(false);

    const res = await createTagAction({ name: newName.trim(), color: newColor });
    if (!res.success) toast.error("Error al crear: " + res.error);
    else toast.success("Tag creada");
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  async function handleUpdate(tag: Tag) {
    if (!editName.trim()) return;
    updateTag(tag.id, { name: editName.trim(), color: editColor });
    setEditingId(null);

    const res = await updateTagAction(tag.id, { name: editName.trim(), color: editColor });
    if (!res.success) toast.error("Error al actualizar: " + res.error);
    else toast.success("Tag actualizada");
  }

  async function handleDelete(tag: Tag) {
    deleteTag(tag.id);
    const res = await deleteTagAction(tag.id);
    if (!res.success) toast.error("Error al eliminar: " + res.error);
    else toast.success("Tag eliminada");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Tags</CardTitle>
            <CardDescription>Etiquetas para organizar transacciones</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Cancelar" : "Nueva"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* New tag form */}
        {showForm && (
          <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3">
            <Input
              placeholder="Nombre de la tag..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-all cursor-pointer",
                      newColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                Crear
              </Button>
            </div>
          </div>
        )}

        {/* Tag list */}
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin etiquetas creadas</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) =>
              editingId === tag.id ? (
                // Edit mode
                <div key={tag.id} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-primary/40 bg-primary/5">
                  <div className="flex gap-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={cn(
                          "w-4 h-4 rounded-full border-2 transition-all cursor-pointer",
                          editColor === c ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-6 text-xs w-24 px-1.5"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(tag);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(tag)} className="text-primary hover:text-primary/80 cursor-pointer">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                // View mode
                <div
                  key={tag.id}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-xs font-medium">#{tag.name}</span>
                  <div className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(tag)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
