"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { debtTypeLabels } from "@/lib/constants";
import type { Debt, Transaction } from "@/types";
import { Edit, Banknote, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Calcula la próxima fecha de pago basado en el día de corte configurado
 * o usa nextPaymentDate si está disponible
 */
function getNextPaymentDate(debt: Debt): Date | null {
  // Si tiene nextPaymentDate configurado, usarlo
  if (debt.nextPaymentDate) {
    return new Date(debt.nextPaymentDate);
  }
  
  // Si solo tiene día de pago, calcular la próxima fecha
  if (debt.paymentDueDay) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Crear fecha con el día de pago en el mes actual
    let nextDate = new Date(currentYear, currentMonth, debt.paymentDueDay);
    
    // Si ya pasó este mes, ir al siguiente
    if (nextDate < today) {
      nextDate = new Date(currentYear, currentMonth + 1, debt.paymentDueDay);
    }
    
    return nextDate;
  }
  
  return null;
}

/**
 * Calcula el inicio del período de facturación actual
 * Es el día de pago del mes anterior a la próxima fecha límite
 */
function getBillingPeriodStart(debt: Debt, nextPaymentDate: Date | null): Date | null {
  if (!nextPaymentDate) return null;
  
  // El inicio del período es el día de pago del mes anterior
  const periodStart = new Date(nextPaymentDate);
  periodStart.setMonth(periodStart.getMonth() - 1);
  
  // Agregar un día después de la fecha límite anterior (el período empieza después del pago anterior)
  periodStart.setDate(periodStart.getDate() + 1);
  
  // Si la deuda empezó después de esta fecha, usar la fecha de inicio de la deuda
  const debtStartDate = new Date(debt.startDate);
  if (debtStartDate > periodStart) {
    return debtStartDate;
  }
  
  return periodStart;
}

/**
 * Calcula los pagos realizados en el período de facturación actual
 * Solo cuenta transacciones tipo "transfer" con transferToDebtId === debt.id
 */
function calculatePeriodPayments(
  debt: Debt,
  transactions: Transaction[],
  periodStart: Date | null,
  periodEnd: Date | null
): number {
  if (!periodStart || !periodEnd) return 0;
  
  // Normalizar fechas para comparación (solo fecha, sin hora)
  const startDate = new Date(periodStart);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(periodEnd);
  endDate.setHours(23, 59, 59, 999);
  
  // Filtrar transacciones que son pagos a esta deuda en el período actual
  const periodPayments = transactions.filter((tx) => {
    // Debe ser una transferencia a esta deuda
    if (tx.type !== "transfer" || tx.transferToDebtId !== debt.id) {
      return false;
    }
    
    // Verificar que esté dentro del período de facturación
    const txDate = new Date(tx.date);
    txDate.setHours(0, 0, 0, 0);
    
    return txDate >= startDate && txDate <= endDate;
  });
  
  // Sumar todos los pagos del período
  return periodPayments.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Formatea la fecha de pago mostrando día y mes
 */
function formatPaymentDueDate(date: Date): string {
  return date.toLocaleDateString("es-MX", { 
    day: "numeric", 
    month: "short" 
  });
}

/**
 * Verifica si la fecha de pago está próxima (dentro de 7 días) o vencida
 */
function getPaymentStatus(nextPaymentDate: Date | null): "ok" | "warning" | "overdue" | null {
  if (!nextPaymentDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const paymentDate = new Date(nextPaymentDate);
  paymentDate.setHours(0, 0, 0, 0);
  
  const diffTime = paymentDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "warning";
  return "ok";
}

interface DebtCardProps {
  debt: Debt;
  transactions?: Transaction[];
  onEdit: () => void;
  onPay?: () => void;
  onClick?: () => void;
}

export function DebtCard({ debt, transactions = [], onEdit, onPay, onClick }: DebtCardProps) {
  const paidAmount = debt.originalAmount - debt.currentBalance;
  const paidPercentage = debt.originalAmount > 0 
    ? Math.min(Math.round((paidAmount / debt.originalAmount) * 100), 100)
    : 0;
  
  const isFullyPaid = debt.currentBalance <= 0;
  const hasSaldoAFavor = debt.currentBalance < 0;
  
  // Calcular fecha de pago y estado
  const nextPaymentDate = getNextPaymentDate(debt);
  const paymentStatus = getPaymentStatus(nextPaymentDate);
  
  // Calcular pago mínimo restante del período actual
  const billingPeriodStart = getBillingPeriodStart(debt, nextPaymentDate);
  const periodPayments = calculatePeriodPayments(debt, transactions, billingPeriodStart, nextPaymentDate);
  const remainingMinimumPayment = debt.minimumPayment 
    ? Math.max(0, debt.minimumPayment - periodPayments)
    : null;
  const minimumPaymentCompleted = remainingMinimumPayment !== null && remainingMinimumPayment === 0;

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden relative",
        isFullyPaid && !hasSaldoAFavor && "opacity-60"
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
          <p className="text-xs text-muted-foreground">
            {hasSaldoAFavor ? "Saldo a favor" : "Saldo pendiente"}
          </p>
          {hasSaldoAFavor ? (
            <CurrencyDisplay
              amount={Math.abs(debt.currentBalance)}
              currency={debt.currency}
              type="income"
              size="lg"
              className="block"
            />
          ) : (
            <CurrencyDisplay
              amount={debt.currentBalance}
              currency={debt.currency}
              type={debt.currentBalance > 0 ? "expense" : "neutral"}
              size="lg"
              className="block"
            />
          )}
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
        {(debt.minimumPayment || debt.paymentDueDay || nextPaymentDate || debt.interestRate) && (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-2">
            <div className="grid grid-cols-2 gap-2">
              {debt.minimumPayment && (
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    {minimumPaymentCompleted ? "Pago mínimo completado ✓" : "Pago mínimo restante"}
                  </p>
                  <div className="flex items-center gap-1">
                    {minimumPaymentCompleted ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : remainingMinimumPayment !== null && remainingMinimumPayment < debt.minimumPayment ? (
                      <span className="text-[9px] text-amber-600 font-medium">Parcial</span>
                    ) : null}
                    <CurrencyDisplay
                      amount={remainingMinimumPayment ?? debt.minimumPayment}
                      currency={debt.currency}
                      size="sm"
                      className={cn(
                        "font-medium",
                        minimumPaymentCompleted && "text-emerald-600"
                      )}
                    />
                  </div>
                  {periodPayments > 0 && !minimumPaymentCompleted && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      Abonado: <CurrencyDisplay amount={periodPayments} currency={debt.currency} size="sm" type="income" /> de{" "}
                      <CurrencyDisplay amount={debt.minimumPayment} currency={debt.currency} size="sm" />
                    </p>
                  )}
                </div>
              )}
              {/* Fecha de pago con día y mes */}
              {nextPaymentDate && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Fecha límite de pago</p>
                  <div className="flex items-center gap-1">
                    {paymentStatus === "overdue" && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    {paymentStatus === "warning" && (
                      <Calendar className="w-3 h-3 text-amber-500" />
                    )}
                    {paymentStatus === "ok" && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    )}
                    <p className={cn(
                      "text-xs font-medium",
                      paymentStatus === "overdue" && "text-red-500",
                      paymentStatus === "warning" && "text-amber-500"
                    )}>
                      {formatPaymentDueDate(nextPaymentDate)}
                    </p>
                  </div>
                  {paymentStatus === "overdue" && (
                    <p className="text-[10px] text-red-500">Vencido</p>
                  )}
                  {paymentStatus === "warning" && (
                    <p className="text-[10px] text-amber-500">Próximo a vencer</p>
                  )}
                </div>
              )}
              {/* Fallback: solo día si no hay fecha completa */}
              {!nextPaymentDate && debt.paymentDueDay && (
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
