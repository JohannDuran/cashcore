"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { debtTypeLabels } from "@/lib/constants";
import type { Debt } from "@/types";
import { Edit, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebtCardProps {
  debt: Debt;
  onEdit: () => void;
  onPay?: () => void;
  onClick?: () => void;
}

export function DebtCard({ debt, onEdit, onPay, onClick }: DebtCardProps) {
  const paidAmount = debt.originalAmount - debt.currentBalance;
  const paidPercentage = debt.originalAmount > 0 
    ? Math.min(Math.round((paidAmount / debt.originalAmount) * 100), 100)
    : 0;
  
  const isFullyPaid = debt.currentBalance <= 0;

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden relative",
        isFullyPaid && "opacity-60"
      )}
      onClick={onClick}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: debt.color }}
      />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${debt.color}15` }}
            >
              <IconRenderer name={debt.icon} size={22} />
            </div>
            <div>
              <h3 className="font-semibold font-display text-sm">{debt.name}</h3>
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                {debtTypeLabels[debt.type] || debt.type}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isFullyPaid && onPay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onPay(); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-xs gap-1.5"
              >
                <Banknote className="w-3.5 h-3.5" />
                Abonar
              </Button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent cursor-pointer"
              aria-label="Editar deuda"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Saldo actual */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <CurrencyDisplay
            amount={Math.max(debt.currentBalance, 0)}
            currency={debt.currency}
            type={debt.currentBalance > 0 ? "expense" : "neutral"}
            size="lg"
            className="block"
          />
        </div>

        {/* Progreso de pago */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{paidPercentage}% pagado</span>
            <span>
              Monto original: <CurrencyDisplay amount={debt.originalAmount} currency={debt.currency} size="sm" />
            </span>
          </div>
          <Progress
            value={paidPercentage}
            className="h-2"
            indicatorClassName={
              paidPercentage >= 100 ? "bg-emerald-500" : paidPercentage >= 75 ? "bg-primary" : paidPercentage >= 50 ? "bg-amber-500" : "bg-rose-500"
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pagado</span>
            <CurrencyDisplay amount={paidAmount} currency={debt.currency} size="sm" type="income" />
          </div>
        </div>

        {/* Detalles de pago */}
        {(debt.minimumPayment || debt.paymentDueDay || debt.interestRate) && (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-2">
            <div className="grid grid-cols-2 gap-2">
              {debt.minimumPayment && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Pago mínimo</p>
                  <CurrencyDisplay
                    amount={debt.minimumPayment}
                    currency={debt.currency}
                    size="sm"
                    className="font-medium"
                  />
                </div>
              )}
              {debt.paymentDueDay && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Día de pago</p>
                  <p className="text-xs font-medium">Día {debt.paymentDueDay}</p>
                </div>
              )}
            </div>
            {debt.interestRate && (
              <div className="border-t border-border/60 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Tasa de interés anual</p>
                  <p className="text-xs font-medium">{debt.interestRate}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fecha de inicio */}
        <p className="text-[10px] text-muted-foreground mt-2">
          Desde {new Date(debt.startDate).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}
          {debt.endDate && ` — hasta ${new Date(debt.endDate).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}`}
        </p>
      </CardContent>
    </Card>
  );
}
