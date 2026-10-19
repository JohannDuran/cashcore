"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { deleteTransactionAction } from "@/app/actions/transaction.actions";
import { useCashCoreStore } from "@/store";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import type { Transaction, Wallet, Debt, Category } from "@/types";
import { cn } from "@/lib/utils";

// Tipo unión para cuenta (Wallet o Debt)
type Account = Wallet | Debt;

function isWallet(account: Account): account is Wallet {
  return "balance" in account;
}

interface AffectedAccount {
  account: Account;
  role: "source" | "destination";
  /** Cómo cambia el balance como resultado de revertir esta transacción */
  delta: number;
}

function buildAffectedAccounts(
  tx: Transaction,
  wallets: Wallet[],
  debts: Debt[]
): AffectedAccount[] {
  const result: AffectedAccount[] = [];

  // ── Cuenta origen ──
  const sourceWallet = tx.walletId ? wallets.find((w) => w.id === tx.walletId) : undefined;
  const sourceDebt = tx.debtId ? debts.find((d) => d.id === tx.debtId) : undefined;
  const source = sourceWallet ?? sourceDebt;

  if (source) {
    // Al revertir: si era expense/transfer la wallet recibe +amount; si era income recibe -amount
    let delta = 0;
    if (tx.type === "expense" || tx.type === "transfer") {
      delta = tx.amount; // se le devuelve lo que se le restó
    } else if (tx.type === "income") {
      delta = -tx.amount; // se le quita lo que se le sumó
    }
    result.push({ account: source, role: "source", delta });
  }

  // ── Cuenta destino (solo transferencias) ──
  if (tx.type === "transfer") {
    const destWallet = tx.transferToWalletId
      ? wallets.find((w) => w.id === tx.transferToWalletId)
      : undefined;
    const destDebt = tx.transferToDebtId
      ? debts.find((d) => d.id === tx.transferToDebtId)
      : undefined;
    const dest = destWallet ?? destDebt;

    if (dest) {
      // Al revertir una transferencia: el destino tenía +amount, lo revertimos con -amount
      result.push({ account: dest, role: "destination", delta: -tx.amount });
    }
  }

  return result;
}

interface DeleteTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}

export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
  category,
}: DeleteTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { wallets, debts, deleteTransaction } = useCashCoreStore();

  if (!transaction) return null;

  const affected = buildAffectedAccounts(transaction, wallets, debts);
  const hasAffected = affected.length > 0;

  async function handleConfirm() {
    if (!transaction) return;
    setLoading(true);
    try {
      const result = await deleteTransactionAction(transaction.id);
      if (result.success) {
        deleteTransaction(transaction.id);
        onOpenChange(false);
      } else {
        console.error("Error al eliminar transacción:", result.error);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  }

  const typeLabel =
    transaction.type === "income"
      ? "Ingreso"
      : transaction.type === "expense"
        ? "Gasto"
        : "Transferencia";

  const typeColor =
    transaction.type === "income"
      ? "income"
      : transaction.type === "transfer"
        ? "transfer"
        : "expense";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Eliminar transacción</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Resumen de la transacción */}
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: category ? `${category.color}20` : "#64748B20" }}
                    >
                      <IconRenderer
                        name={category?.icon || "MoreHorizontal"}
                        size={14}
                        className="text-foreground"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{typeLabel}</p>
                    </div>
                  </div>
                  <CurrencyDisplay
                    amount={transaction.amount}
                    currency={transaction.currency}
                    type={typeColor}
                    showSign
                    size="sm"
                    className="font-semibold shrink-0"
                  />
                </div>
              </div>

              {/* Cuentas afectadas */}
              {hasAffected && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Se revertirán los siguientes movimientos
                  </p>
                  <div className="space-y-1.5">
                    {affected.map(({ account, role, delta }) => {
                      const isPos = delta > 0;
                      return (
                        <div
                          key={`${account.id}-${role}`}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: account.color }}
                            />
                            <span className="text-sm text-foreground truncate">
                              {account.name}
                            </span>
                            {role === "destination" && (
                              <span className="flex items-center text-xs text-muted-foreground shrink-0">
                                <ArrowRight className="w-3 h-3 mr-0.5" />
                                destino
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums shrink-0",
                              isPos ? "text-income" : "text-expense"
                            )}
                          >
                            {isPos ? "+" : ""}
                            {delta.toLocaleString("es-MX", {
                              style: "currency",
                              currency: isWallet(account)
                                ? account.currency
                                : account.currency,
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando…
              </span>
            ) : (
              "Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
