"use client";

import { useMemo } from "react";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { formatDateGroup } from "@/lib/utils";
import type { Transaction, Category, Wallet, Debt } from "@/types";
import { useCashCoreStore } from "@/store";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  debts: Debt[];
}

export function TransactionList({ transactions, categories, wallets, debts }: TransactionListProps) {
  const { setActiveModal, setEditingItem, tags } = useCashCoreStore();

  // Mapa id -> tag para resolver las etiquetas (que llegan como IDs) a nombre y color.
  const tagById = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>();
    for (const t of tags) m.set(t.id, { id: t.id, name: t.name, color: t.color });
    return m;
  }, [tags]);

  // Resuelve las tags de una transacción (strings u objetos) a objetos {id, name, color}.
  function resolveTags(tx: Transaction): { id: string; name: string; color: string }[] {
    if (!Array.isArray(tx.tags)) return [];
    return tx.tags
      .map((t: unknown) => {
        if (typeof t === "string") {
          return tagById.get(t) ?? { id: t, name: t, color: "#64748B" };
        }
        if (t && typeof t === "object" && "id" in t) {
          const obj = t as { id: string; name?: string; color?: string };
          return tagById.get(obj.id) ?? { id: obj.id, name: obj.name ?? obj.id, color: obj.color ?? "#64748B" };
        }
        return null;
      })
      .filter((x): x is { id: string; name: string; color: string } => !!x);
  }

  const grouped = useMemo(() => {
    // Primero, sanitizamos las fechas de todas las transacciones
    const safeTransactions = transactions.map(tx => ({
      ...tx,
      date: tx.date && !isNaN(new Date(tx.date).getTime()) 
        ? new Date(tx.date).toISOString() 
        : new Date().toISOString()
    }));

    const sorted = [...safeTransactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // Si alguna fecha es NaN (no debería ocurrir por la sanitización), la tratamos como 0
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

    const groups = new Map<string, Transaction[]>();
    sorted.forEach((tx) => {
      // Extraemos YYYY-MM-DD de forma segura
      const dateStr = tx.date.split("T")[0];
      const key = dateStr || "unknown";
      const existing = groups.get(key) || [];
      existing.push(tx);
      groups.set(key, existing);
    });

    return Array.from(groups.entries()).map(([date, txs]) => ({
      date,
      label: formatDateGroup(date),
      transactions: txs,
    }));
  }, [transactions]);

  function handleEdit(tx: Transaction) {
    setEditingItem(tx);
    setActiveModal("transaction-form");
  }

  // Cuenta "placeholder" para cuando la wallet real ya no existe (fue eliminada):
  // reutilizamos el nombre guardado en la transacción para no mostrar "?".
  const COLOR_ELIMINADA = "#94A3B8"; // gris neutro
  function placeholderAccount(name: string) {
    return { id: "__deleted__", name, color: COLOR_ELIMINADA, balance: 0 } as unknown as Wallet;
  }

  // Función helper para obtener la cuenta origen (wallet o debt)
  function getSourceAccount(tx: Transaction) {
    if (tx.walletId) {
      const w = wallets.find((w) => w.id === tx.walletId);
      if (w) return w;
    }
    if (tx.debtId) {
      const d = debts.find((d) => d.id === tx.debtId);
      if (d) return d;
    }
    // La wallet/deuda ya no existe: usar el nombre preservado si lo hay
    if (tx.walletName) return placeholderAccount(tx.walletName);
    return undefined;
  }

  // Función helper para obtener la cuenta destino de transferencia (wallet o debt)
  function getTransferDestination(tx: Transaction) {
    if (tx.type !== "transfer") return undefined;

    // Primero verificamos si viene la relación ya incluida desde el servidor
    if (tx.transferToWallet) return tx.transferToWallet;
    if (tx.transferToDebt) return tx.transferToDebt;

    // Si no, buscamos por ID
    if (tx.transferToWalletId) {
      const w = wallets.find((w) => w.id === tx.transferToWalletId);
      if (w) return w;
    }
    if (tx.transferToDebtId) {
      const d = debts.find((d) => d.id === tx.transferToDebtId);
      if (d) return d;
    }
    // Destino preservado (wallet eliminada) o transferencia a tercero
    if (tx.transferToWalletName) return placeholderAccount(tx.transferToWalletName);
    if (tx.externalRecipient) return placeholderAccount(tx.externalRecipient);
    return undefined;
  }

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.date}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
            {group.label}
          </h3>
          <div className="space-y-0.5">
            {group.transactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                category={categories.find((c) => c.id === tx.categoryId)}
                sourceAccount={getSourceAccount(tx)}
                transferToAccount={getTransferDestination(tx)}
                resolvedTags={resolveTags(tx)}
                onClick={() => handleEdit(tx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}