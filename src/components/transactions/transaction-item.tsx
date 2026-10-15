"use client";

import { IconRenderer } from "@/components/shared/icon-renderer";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import type { Transaction, Category, Wallet, Debt } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

// Tipo unión para cuenta origen/destino (Wallet o Debt)
type Account = Wallet | Debt;

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  sourceAccount?: Account;
  transferToAccount?: Account;
  onClick?: () => void;
}

// Helper para verificar si es una Wallet (tiene balance)
function isWallet(account: Account): account is Wallet {
  return 'balance' in account;
}

export function TransactionItem({ transaction, category, sourceAccount, transferToAccount, onClick }: TransactionItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 py-3 px-3 -mx-1 rounded-xl hover:bg-accent/50 transition-all duration-200 w-full text-left cursor-pointer group"
      )}
      type="button"
    >
      {/* Category Icon */}
      <div
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: category ? `${category.color}20` : "#64748B20" }}
      >
        <IconRenderer
          name={category?.icon || "MoreHorizontal"}
          size={18}
          className="text-foreground"
        />
      </div>

      {/* Description + Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{category?.name || "Sin categoría"}</span>
          {transaction.type === "transfer" && sourceAccount ? (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sourceAccount.color }} />
                {sourceAccount.name}
                <ArrowRight className="w-3 h-3 text-transfer" />
                {transferToAccount ? (
                  <>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: transferToAccount.color }} />
                    {transferToAccount.name}
                  </>
                ) : (
                  "?"
                )}
              </span>
            </>
          ) : sourceAccount ? (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{sourceAccount.name}</span>
            </>
          ) : null}
          {transaction.tags && transaction.tags.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              {transaction.tags.slice(0, 2).map((tag: any) => (
                <Badge key={typeof tag === 'string' ? tag : tag.id || tag.name} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  #{typeof tag === 'string' ? tag : tag.name}
                </Badge>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Amount + Date */}
      <div className="text-right shrink-0">
        <CurrencyDisplay
          amount={transaction.amount}
          currency={transaction.currency}
          type={transaction.type === "income" ? "income" : transaction.type === "transfer" ? "transfer" : "expense"}
          showSign
          size="sm"
          className="font-semibold"
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeDate(transaction.date)}
        </p>
      </div>
    </button>
  );
}
