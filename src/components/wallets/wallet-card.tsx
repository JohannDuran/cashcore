"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { walletTypeLabels } from "@/lib/constants";
import type { Transaction, Wallet } from "@/types";
import { Edit } from "lucide-react";
import { cn, calculateInterestProjection } from "@/lib/utils";
import { useMemo } from "react";

interface WalletCardProps {
  wallet: Wallet;
  onEdit: () => void;
  onClick?: () => void;
  currentDate: Date;
  transactions: Transaction[];
}

export function WalletCard({ wallet, onEdit, onClick, currentDate, transactions }: WalletCardProps) {
  const isCredit = wallet.type === "credit";
  const isDebt = isCredit || wallet.type === "loan";
  const debtAmount = isDebt ? Math.max(-wallet.balance, 0) : 0;
  const debtBalanceInFavor = isDebt ? Math.max(wallet.balance, 0) : 0;
  const creditAvailable = isCredit && wallet.creditLimit
    ? Math.max(wallet.creditLimit - debtAmount + debtBalanceInFavor, 0)
    : 0;
  const creditUsed = isCredit && wallet.creditLimit
    ? Math.min(Math.round((debtAmount / wallet.creditLimit) * 100), 100)
    : 0;
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const paidThisMonth = isDebt
    ? transactions
        .filter((transaction) => {
          if (transaction.type !== "transfer" || transaction.transferToWalletId !== wallet.id) {
            return false;
          }

          const transactionDate = new Date(transaction.date);
          return transactionDate >= monthStart && transactionDate < nextMonthStart;
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0)
    : 0;
  const monthlyTarget = wallet.monthlyPayment || 0;
  const payableThisMonth = paidThisMonth + debtAmount;
  const effectivePaymentTarget = monthlyTarget > 0
    ? Math.min(monthlyTarget, payableThisMonth)
    : 0;
  const remainingPayment = Math.max(effectivePaymentTarget - paidThisMonth, 0);
  const paymentProgress = effectivePaymentTarget > 0
    ? Math.min(Math.round((paidThisMonth / effectivePaymentTarget) * 100), 100)
    : paidThisMonth > 0 ? 100 : 0;
  const hasPaymentDetails = isDebt && (wallet.monthlyPayment || wallet.paymentDueDay || paidThisMonth > 0);

  const interestProjection = useMemo(() => {
    if (!wallet.interestEnabled || !wallet.interestRate) return null;
    const startDate = wallet.interestStartDate
      ? new Date(wallet.interestStartDate)
      : new Date(wallet.createdAt);
    return calculateInterestProjection(wallet.balance, wallet.interestRate, startDate, currentDate);
  }, [wallet.interestEnabled, wallet.interestRate, wallet.interestStartDate, wallet.createdAt, wallet.balance, currentDate]);

  const hasInterest = !!interestProjection && wallet.interestRate && wallet.interestRate > 0;

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden relative",
      )}
      onClick={onClick}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: wallet.color }}
      />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${wallet.color}15` }}
            >
              <IconRenderer name={wallet.icon} size={22} />
            </div>
            <div>
              <h3 className="font-semibold font-display text-sm">{wallet.name}</h3>
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                {walletTypeLabels[wallet.type] || wallet.type}
              </Badge>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent cursor-pointer"
            aria-label="Editar wallet"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {isDebt ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {hasInterest ? "Deuda proyectada" : "Deuda actual"}
            </p>
            <CurrencyDisplay
              amount={hasInterest ? Math.max(-interestProjection!.projectedBalance, 0) : debtAmount}
              currency={wallet.currency}
              type={debtAmount > 0 ? "expense" : "neutral"}
              size="lg"
              className="block"
            />
            {hasInterest && (
              <p className="text-xs text-muted-foreground">
                Deuda base:{" "}
                <CurrencyDisplay amount={debtAmount} currency={wallet.currency} size="sm" />
              </p>
            )}
            {debtBalanceInFavor > 0 && (
              <p className="text-xs text-emerald-500">
                Saldo a favor:{" "}
                <CurrencyDisplay
                  amount={debtBalanceInFavor}
                  currency={wallet.currency}
                  size="sm"
                />
              </p>
            )}
          </div>
        ) : (
          <>
            <CurrencyDisplay
              amount={hasInterest ? interestProjection!.projectedBalance : wallet.balance}
              currency={wallet.currency}
              showSign={wallet.balance < 0}
              size="lg"
              className={cn("block mb-1", wallet.balance < 0 && "text-expense")}
            />
            {hasInterest && (
              <p className="text-xs text-muted-foreground mb-2">
                Saldo base:{" "}
                <CurrencyDisplay amount={wallet.balance} currency={wallet.currency} size="sm" />
              </p>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">{wallet.currency}</p>

        {isCredit && wallet.creditLimit && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{creditUsed}% utilizado</span>
              <span>Límite: ${wallet.creditLimit.toLocaleString("es-MX")}</span>
            </div>
            <Progress
              value={creditUsed}
              className="h-2"
              indicatorClassName={
                creditUsed > 80 ? "bg-red-500" : creditUsed > 50 ? "bg-amber-500" : "bg-primary"
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Disponible</span>
              <CurrencyDisplay amount={creditAvailable} currency={wallet.currency} size="sm" />
            </div>
          </div>
        )}

        {hasPaymentDetails && (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Pago mensual</p>
                {wallet.monthlyPayment ? (
                  <CurrencyDisplay
                    amount={wallet.monthlyPayment}
                    currency={wallet.currency}
                    size="sm"
                    className="font-medium"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin dato</span>
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Límite de pago</p>
                <p className="text-xs font-medium">
                  {wallet.paymentDueDay ? `Día ${wallet.paymentDueDay}` : "Sin dato"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Abonado este mes</p>
                <CurrencyDisplay
                  amount={paidThisMonth}
                  currency={wallet.currency}
                  size="sm"
                  className="font-medium"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Falta por abonar</p>
                <CurrencyDisplay
                  amount={remainingPayment}
                  currency={wallet.currency}
                  type={remainingPayment > 0 ? "expense" : "neutral"}
                  size="sm"
                  className="font-medium"
                />
              </div>
            </div>

            {effectivePaymentTarget > 0 && (
              <Progress
                value={paymentProgress}
                className="h-1.5"
                indicatorClassName={paymentProgress >= 100 ? "bg-emerald-500" : "bg-primary"}
              />
            )}
          </div>
        )}

        {hasInterest && interestProjection && (
          <div className="mt-3 space-y-1.5 rounded-lg bg-muted/50 p-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">Tasa anual</p>
              <p className="text-xs font-medium">{wallet.interestRate}%</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {isDebt ? "Interés acumulado" : "Rendimiento generado"}
                </p>
                <CurrencyDisplay
                  amount={Math.abs(interestProjection.interestEarned)}
                  currency={wallet.currency}
                  type={isDebt ? "expense" : "income"}
                  size="sm"
                  className="font-medium"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Rendimiento diario</p>
                <CurrencyDisplay
                  amount={Math.abs(interestProjection.dailyInterest)}
                  currency={wallet.currency}
                  type={isDebt ? "expense" : "income"}
                  size="sm"
                  className="font-medium"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              {interestProjection.daysElapsed} días desde{" "}
              {(wallet.interestStartDate
                ? new Date(wallet.interestStartDate)
                : new Date(wallet.createdAt)
              ).toLocaleDateString("es-MX")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
