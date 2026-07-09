"use client";

import { useMemo } from "react";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { formatDateGroup } from "@/lib/utils";
import type { Transaction, Category, Wallet } from "@/types";
import { useCashCoreStore } from "@/store";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
}

export function TransactionList({ transactions, categories, wallets }: TransactionListProps) {
  const { setActiveModal, setEditingItem } = useCashCoreStore();

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
                wallet={wallets.find((w) => w.id === tx.walletId)}
                transferToWallet={tx.type === "transfer" ? wallets.find((w) => w.id === tx.transferToWalletId) : undefined}
                onClick={() => handleEdit(tx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}