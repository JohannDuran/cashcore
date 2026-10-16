"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TransactionType, Wallet, Category } from "@/types";
import { Search, X } from "lucide-react";

interface TransactionFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: TransactionType | "all";
  onTypeChange: (v: TransactionType | "all") => void;
  walletFilter: string;
  onWalletChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  wallets: Wallet[];
  categories: Category[];
}

const typeOptions: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Ingresos" },
  { value: "expense", label: "Gastos" },
  { value: "transfer", label: "Transferencias" },
];

export function TransactionFilters({
  search, onSearchChange,
  typeFilter, onTypeChange,
  walletFilter, onWalletChange,
  categoryFilter, onCategoryChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  wallets, categories,
}: TransactionFiltersProps) {
  const hasDateFilter = !!dateFrom || !!dateTo;
  return (
    <div className="space-y-3">
      {/* Type filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTypeChange(opt.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer",
              typeFilter === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search + Dropdown filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transacciones..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={walletFilter} onValueChange={onWalletChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos los wallets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los wallets</SelectItem>
            {wallets.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                  {w.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="date-from" className="text-xs text-muted-foreground">Desde</Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="date-to" className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => onDateToChange(e.target.value)}
            className="mt-1"
          />
        </div>
        {hasDateFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { onDateFromChange(""); onDateToChange(""); }}
            className="gap-1 text-muted-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar fechas
          </Button>
        )}
      </div>
    </div>
  );
}
