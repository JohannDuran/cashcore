"use client";

import { useState, useMemo, useEffect } from "react";
import { useCashCoreStore } from "@/store";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { TransactionType } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** Formatea una Date a "YYYY-MM-DD" usando componentes LOCALES (para inputs type=date). */
function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TransactionsPage() {
  const { transactions, wallets, categories, debts, setActiveModal, editingItem, deleteTransaction, setEditingItem } =
    useCashCoreStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [walletFilter, setWalletFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Rango por defecto: desde hace un mes hasta hoy (formato "YYYY-MM-DD" local).
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toInputDate(d);
  });
  const [dateTo, setDateTo] = useState(() => toInputDate(new Date()));

  // Diagnóstico: detecta transacciones con fecha inválida en el store original
  useEffect(() => {
    const invalid = transactions.filter(
      (tx) => !tx.date || isNaN(new Date(tx.date).getTime())
    );
    if (invalid.length) {
      console.warn("⚠️ Transacciones con fecha inválida encontradas:", invalid);
    }
  }, [transactions]);

  // Devuelve el día de calendario (YYYY-MM-DD) real de una fecha de transacción.
  // Las fechas vienen como @db.Date (medianoche UTC), así que tomamos la parte de fecha
  // directamente para no correr el día por zona horaria (bug recurrente ya corregido).
  function txCalendarDay(value: string | Date): string {
    if (typeof value === "string") {
      const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
      const d = new Date(value);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }

  // Filtrado + sanitización de fechas
  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        // Filtrar por walletId o debtId
        if (walletFilter !== "all" && tx.walletId !== walletFilter && tx.debtId !== walletFilter) return false;
        if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;
        // Filtro por rango de fechas (comparación por día de calendario, inclusivo)
        if (dateFrom || dateTo) {
          const day = txCalendarDay(tx.date);
          if (dateFrom && day < dateFrom) return false;
          if (dateTo && day > dateTo) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          if (
            !tx.description.toLowerCase().includes(q) &&
            !(tx.tags ?? []).some((t) => {
              const name = typeof t === "string" ? t : (t as { name?: string } | null | undefined)?.name ?? "";
              return name.toLowerCase().includes(q);
            })
          ) {
            return false;
          }
        }
        return true;
      })
      .map((tx) => ({
        ...tx,
        // Asegura que la fecha sea una cadena ISO válida
        date: tx.date && !isNaN(new Date(tx.date).getTime()) 
          ? new Date(tx.date).toISOString() 
          : new Date().toISOString()
      }));
  }, [transactions, typeFilter, walletFilter, categoryFilter, search, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  function handleDelete() {
    if (editingItem && ("walletId" in editingItem || "debtId" in editingItem)) {
      deleteTransaction(editingItem.id);
      setEditingItem(null);
      toast.success("Transacción eliminada");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Transacciones</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} movimientos</p>
        </div>
        <Button onClick={() => setActiveModal("transaction-form")} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva transacción</span>
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        walletFilter={walletFilter}
        onWalletChange={setWalletFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        wallets={wallets}
        categories={categories}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
            <CurrencyDisplay amount={summary.income} type="income" size="sm" className="font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Gastos</p>
            <CurrencyDisplay amount={summary.expense} type="expense" size="sm" className="font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <CurrencyDisplay
              amount={summary.net}
              type={summary.net >= 0 ? "income" : "expense"}
              size="sm"
              className="font-semibold"
            />
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="ArrowLeftRight"
          title="Sin transacciones"
          description="No hay transacciones que coincidan con tus filtros. Intenta cambiar los filtros o crea una nueva transacción."
          actionLabel="Nueva transacción"
          onAction={() => setActiveModal("transaction-form")}
        />
      ) : (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <TransactionList transactions={filtered} categories={categories} wallets={wallets} debts={debts} />
          </CardContent>
        </Card>
      )}

      {/* Delete dialog — triggered from edit flow */}
      {editingItem && ("walletId" in editingItem || "debtId" in editingItem) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hidden" id="delete-tx-trigger">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El balance del wallet se actualizará automáticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}