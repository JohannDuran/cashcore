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

// ══════════════════════════════════════════════════════════════════════════════
// UTILIDADES PARA CÁLCULO DE CICLOS DE TARJETAS DE CRÉDITO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una fecha para un día específico en un mes/año dado.
 * Si el día es mayor que los días del mes, usa el último día del mes.
 */
function dateForDay(year: number, month: number, day: number): Date {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDayOfMonth));
}

/**
 * Agrega meses a una fecha, manejando correctamente el overflow de días.
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Formatea fecha como YYYY-MM-DD para debug
 */
function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Normaliza cualquier valor de fecha a una Date a medianoche LOCAL representando
 * su día de calendario real.
 *
 * Las fechas de transacción se guardan en Postgres como `@db.Date` (medianoche UTC),
 * por lo que llegan como "2026-10-15T00:00:00.000Z" o como Date en medianoche UTC.
 * Si usáramos `new Date(valor)` + `setHours(0,0,0,0)` en una zona con offset negativo
 * (ej. GMT-6), el día se correría a la fecha anterior. Para evitarlo tomamos los
 * componentes de calendario en UTC y construimos una fecha local equivalente, de modo
 * que coincida con los límites de ciclo que sí se construyen en hora local.
 */
function toCalendarDate(value: Date | string): Date {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const parsed = new Date(value);
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  }
  // Date de `@db.Date` = medianoche UTC: usar componentes UTC como día de calendario.
  return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/**
 * Estructura que representa un ciclo de facturación completo.
 */
interface BillingCycle {
  /** Inicio del periodo de compras (día después del corte anterior) */
  purchaseStart: Date;
  /** Fin del periodo de compras (día de corte) */
  purchaseEnd: Date;
  /** Fecha límite para pagar este ciclo */
  paymentDueDate: Date;
}

/**
 * Calcula los ciclos de facturación de una tarjeta de crédito.
 * 
 * @param statementDay - Día del mes en que se corta (1-31)
 * @param paymentDueDay - Día del mes en que vence el pago (1-31)
 * @param paymentDueMonthOffset - Meses después del corte que vence (0, 1, o 2)
 * @param referenceDate - Fecha de referencia (default: hoy)
 * 
 * @returns Objeto con los ciclos calculados
 */
function calculateBillingCycles(
  statementDay: number,
  paymentDueDay: number,
  paymentDueMonthOffset: number = 0,
  referenceDate: Date = new Date()
): {
  /** Ciclo cerrado: el que ya se facturó y cuyo pago está por vencer o ya venció */
  closedCycle: BillingCycle;
  /** Ciclo actual: el que está en curso, acumulando compras */
  currentCycle: BillingCycle;
  /** Próximo ciclo: el siguiente (informativo) */
  nextCycle: BillingCycle;
} {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  // Encontrar el último corte que ya ocurrió
  let lastCutoff = dateForDay(today.getFullYear(), today.getMonth(), statementDay);
  if (lastCutoff > today) {
    // El corte de este mes aún no llega, usar el del mes anterior
    lastCutoff = dateForDay(today.getFullYear(), today.getMonth() - 1, statementDay);
  }

  // Corte anterior al último (inicio del ciclo cerrado)
  const prevCutoff = dateForDay(
    lastCutoff.getFullYear(),
    lastCutoff.getMonth() - 1,
    statementDay
  );

  // Próximo corte (fin del ciclo actual)
  const nextCutoff = dateForDay(
    lastCutoff.getFullYear(),
    lastCutoff.getMonth() + 1,
    statementDay
  );

  // Corte después del próximo (fin del siguiente ciclo)
  const futureNextCutoff = dateForDay(
    nextCutoff.getFullYear(),
    nextCutoff.getMonth() + 1,
    statementDay
  );

  // Calcular fechas de pago basadas en el offset de meses
  // La fecha de pago es: mes del corte + offset, día paymentDueDay
  const closedPaymentDue = dateForDay(
    lastCutoff.getFullYear(),
    lastCutoff.getMonth() + paymentDueMonthOffset,
    paymentDueDay
  );

  const currentPaymentDue = dateForDay(
    nextCutoff.getFullYear(),
    nextCutoff.getMonth() + paymentDueMonthOffset,
    paymentDueDay
  );

  const nextPaymentDue = dateForDay(
    futureNextCutoff.getFullYear(),
    futureNextCutoff.getMonth() + paymentDueMonthOffset,
    paymentDueDay
  );

  // Construir los ciclos
  // El día de inicio de compras es el día DESPUÉS del corte anterior
  const closedCycle: BillingCycle = {
    purchaseStart: new Date(prevCutoff.getTime() + 24 * 60 * 60 * 1000), // día siguiente al corte anterior
    purchaseEnd: lastCutoff,
    paymentDueDate: closedPaymentDue,
  };

  const currentCycle: BillingCycle = {
    purchaseStart: new Date(lastCutoff.getTime() + 24 * 60 * 60 * 1000), // día siguiente al último corte
    purchaseEnd: nextCutoff,
    paymentDueDate: currentPaymentDue,
  };

  const nextCycle: BillingCycle = {
    purchaseStart: new Date(nextCutoff.getTime() + 24 * 60 * 60 * 1000),
    purchaseEnd: futureNextCutoff,
    paymentDueDate: nextPaymentDue,
  };

  return { closedCycle, currentCycle, nextCycle };
}

/**
 * Cuenta cuántos cortes de estado de cuenta (en `statementDay`) separan la fecha de
 * compra del fin de un ciclo (`cutEnd`, que es un día de corte).
 *
 * El índice 0 corresponde al PRIMER corte que ocurre justo después de la compra
 * (el ciclo en el que cae la compra). Para una compra a MSI, los pagos vigentes son
 * los índices 0..(msiMonths-1).
 *
 * Devuelve -1 si el corte es anterior a la compra (no aplica todavía).
 */
function installmentIndexForCut(purchaseDate: Date, cutEnd: Date, statementDay: number): number {
  const p = toCalendarDate(purchaseDate);
  const cut = toCalendarDate(cutEnd);
  if (cut < p) return -1;

  // El primer corte posterior (o igual) a la compra = índice 0.
  let firstCut = dateForDay(p.getFullYear(), p.getMonth(), statementDay);
  if (firstCut < p) {
    // El corte de este mes ya pasó respecto a la compra → el siguiente mes
    firstCut = dateForDay(p.getFullYear(), p.getMonth() + 1, statementDay);
  }
  firstCut = toCalendarDate(firstCut);

  if (cut < firstCut) return -1;

  // Contar meses de corte entre firstCut y cut (ambos caen en statementDay)
  return (cut.getFullYear() - firstCut.getFullYear()) * 12 + (cut.getMonth() - firstCut.getMonth());
}

/**
 * Monto con que una transacción aporta a un ciclo cuyo corte termina en `cutEnd`.
 * - Compra normal: su monto completo, solo si cae dentro de la ventana [start, end].
 * - Compra a MSI (msiMonths > 1): la mensualidad (amount/msiMonths), y solo si el corte
 *   corresponde a uno de los pagos vigentes (índice 0..msiMonths-1). El monto completo
 *   NO se suma de golpe; se reparte en N cortes, igual que el estado de cuenta del banco.
 */
function contributionForCut(
  tx: Transaction,
  statementDay: number,
  windowStart: Date,
  cutEnd: Date
): number {
  const txDate = toCalendarDate(tx.date as unknown as Date | string);
  const msi = tx.msiMonths ?? null;

  if (msi && msi > 1) {
    // Para MSI, la ventana del propio mes no basta: el pago aplica en N cortes.
    const idx = installmentIndexForCut(txDate, cutEnd, statementDay);
    if (idx >= 0 && idx < msi) {
      return tx.amount / msi;
    }
    return 0;
  }

  // Compra/pago normal: contribuye su monto completo solo si cae en la ventana del ciclo.
  const start = new Date(windowStart); start.setHours(0, 0, 0, 0);
  const end = new Date(cutEnd); end.setHours(23, 59, 59, 999);
  return txDate >= start && txDate <= end ? tx.amount : 0;
}

/**
 * Suma el monto de transacciones que aplican a un ciclo cuyo corte termina en `end`.
 * Para compras a MSI reparte la mensualidad según el corte (ver contributionForCut).
 */
function sumTransactionsInRange(
  debt: Debt,
  transactions: Transaction[],
  kind: "purchase" | "payment",
  start: Date,
  end: Date
): number {
  const statementDay = debt.statementDay ?? 1;

  return transactions
    .filter((tx) => {
      return kind === "purchase"
        ? tx.type === "expense" && tx.debtId === debt.id
        : tx.type === "transfer" && tx.transferToDebtId === debt.id;
    })
    .reduce((sum, tx) => {
      // Los MSI solo aplican a compras; los pagos siempre son por su monto completo.
      if (kind === "payment") {
        const txDate = toCalendarDate(tx.date as unknown as Date | string);
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(23, 59, 59, 999);
        return txDate >= s && txDate <= e ? sum + tx.amount : sum;
      }
      return sum + contributionForCut(tx, statementDay, start, end);
    }, 0);
}

/**
 * Calcula la próxima fecha de pago para mostrar en la UI.
 */
function getNextPaymentDate(debt: Debt): Date | null {
  // Si tiene nextPaymentDate configurado manualmente, usarlo
  if (debt.nextPaymentDate) {
    const val = debt.nextPaymentDate as unknown;
    
    // Si ya es Date (puede venir así de Prisma/runtime)
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val;
    }
    
    // Si es string
    if (typeof val === 'string') {
      // Formato ISO con hora: "2024-01-15T00:00:00.000Z"
      if (val.includes('T')) {
        const datePart = val.split('T')[0];
        const parts = datePart.split('-').map(Number);
        if (parts.length === 3 && parts.every(n => !isNaN(n))) {
          return new Date(parts[0], parts[1] - 1, parts[2]);
        }
      }
      // Formato solo fecha: "2024-01-15"
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [year, month, day] = val.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
    }
    // Fallback for Date objects or other valid date values
    const parsed = new Date(val as string | number | Date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  // Si tiene configuración de ciclos, calcular la próxima fecha de pago
  if (debt.statementDay && debt.paymentDueDay) {
    const cycles = calculateBillingCycles(
      debt.statementDay,
      debt.paymentDueDay,
      debt.paymentDueMonthOffset ?? 0
    );
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Si la fecha de pago del ciclo cerrado aún no pasa, es la próxima
    if (cycles.closedCycle.paymentDueDate >= today) {
      return cycles.closedCycle.paymentDueDate;
    }
    // Si no, la del ciclo actual
    return cycles.currentCycle.paymentDueDate;
  }
  
  // Fallback: solo día de pago sin día de corte
  if (debt.paymentDueDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nextDate = new Date(today.getFullYear(), today.getMonth(), debt.paymentDueDay);
    if (nextDate < today) {
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, debt.paymentDueDay);
    }
    return nextDate;
  }
  
  return null;
}

/**
 * Formatea la fecha de pago mostrando día y mes
 */
function formatPaymentDueDate(date: Date): string {
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
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

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

interface DebtCardProps {
  debt: Debt;
  transactions?: Transaction[];
  onEdit: () => void;
  onPay?: () => void;
  onMarkStatementPaid?: () => void;
  onEditAccruedNextCycle?: () => void;
  onClick?: () => void;
}

export function DebtCard({ 
  debt, 
  transactions = [], 
  onEdit, 
  onPay, 
  onMarkStatementPaid, 
  onEditAccruedNextCycle, 
  onClick 
}: DebtCardProps) {
  const paidAmount = debt.originalAmount - debt.currentBalance;
  const paidPercentage = debt.originalAmount > 0 
    ? Math.min(Math.round((paidAmount / debt.originalAmount) * 100), 100)
    : 0;
  
  const isFullyPaid = debt.currentBalance <= 0;
  const hasSaldoAFavor = debt.currentBalance < 0;
  
  // ── Calcular ciclos de facturación ──
  const hasStatementConfig = !!(debt.statementDay && debt.paymentDueDay);
  
  let requiredThisCycle: number | null = null;
  let accruedNextCycle = 0;
  let closedCycleInfo: { start: string; end: string; paymentDue: string } | null = null;
  let currentCycleInfo: { start: string; end: string } | null = null;
  
  if (hasStatementConfig) {
    const cycles = calculateBillingCycles(
      debt.statementDay!,
      debt.paymentDueDay!,
      debt.paymentDueMonthOffset ?? 0
    );
    
    // Info para mostrar en UI
    closedCycleInfo = {
      start: fmt(cycles.closedCycle.purchaseStart),
      end: fmt(cycles.closedCycle.purchaseEnd),
      paymentDue: fmt(cycles.closedCycle.paymentDueDate),
    };
    currentCycleInfo = {
      start: fmt(cycles.currentCycle.purchaseStart),
      end: fmt(cycles.currentCycle.purchaseEnd),
    };
    
    // DEBUG
    // console.log(`[DebtCard ${debt.name}] Ciclos calculados:`, {
    //   closed: closedCycleInfo,
    //   current: currentCycleInfo,
    //   offset: debt.paymentDueMonthOffset ?? 0,
    // });
    
    // 1) CICLO CERRADO: Compras del periodo anterior - pagos realizados después del corte
    const closedPurchases = sumTransactionsInRange(
      debt, 
      transactions, 
      "purchase", 
      cycles.closedCycle.purchaseStart, 
      cycles.closedCycle.purchaseEnd
    );
    
    // Pagos realizados desde el día después del corte hasta la fecha límite
    const paymentsForClosedCycle = sumTransactionsInRange(
      debt,
      transactions,
      "payment",
      cycles.currentCycle.purchaseStart, // día después del último corte
      cycles.closedCycle.paymentDueDate
    );
    
    // Verificar si el usuario marcó el ciclo como pagado
    const markedPaid = !!debt.statementPaidUntil &&
      new Date(debt.statementPaidUntil).setHours(0, 0, 0, 0) >= 
      cycles.closedCycle.purchaseEnd.setHours(0, 0, 0, 0);
    
    requiredThisCycle = markedPaid ? 0 : Math.max(0, closedPurchases - paymentsForClosedCycle);
    
    // 2) CICLO ACTUAL: Compras acumulándose para el próximo estado de cuenta
    const baseAdjustment = debt.accruedNextCycleOverride ?? 0;
    
    // Si hay un ajuste base con fecha, solo sumar compras desde esa fecha en adelante.
    // accruedOverrideDate es un timestamp (momento en que se fijó la base); se toma
    // su día de calendario local, y se incluyen las compras fechadas ESE DÍA o después.
    // (Antes se usaba setHours sobre el timestamp, lo que con zonas GMT negativas podía
    //  correr el límite un día; ahora se compara por día de calendario.)
    let purchasesStart = cycles.currentCycle.purchaseStart;
    if (debt.accruedNextCycleOverride != null && debt.accruedOverrideDate) {
      const overrideDay = new Date(debt.accruedOverrideDate);
      const localOverrideDay = new Date(
        overrideDay.getFullYear(),
        overrideDay.getMonth(),
        overrideDay.getDate()
      );
      if (localOverrideDay > purchasesStart) {
        purchasesStart = localOverrideDay;
      }
    }
    
    const currentPurchases = sumTransactionsInRange(
      debt,
      transactions,
      "purchase",
      purchasesStart,
      cycles.currentCycle.purchaseEnd
    );

    // Abonos (pagos) realizados dentro del ciclo actual: reducen el acumulado del
    // próximo corte, igual que en el estado de cuenta del banco. Se suman en la misma
    // ventana que las compras (respetando el override date) para que la resta sea coherente.
    const currentPayments = sumTransactionsInRange(
      debt,
      transactions,
      "payment",
      purchasesStart,
      cycles.currentCycle.purchaseEnd
    );

    // El acumulado no puede ser negativo (un sobrepago no genera "saldo a favor" aquí).
    accruedNextCycle = Math.max(0, baseAdjustment + currentPurchases - currentPayments);
    
    // DEBUG
    // const relevantTxs = transactions.filter(tx => tx.type === "expense" && tx.debtId === debt.id);
    // console.log(`[DebtCard ${debt.name}] Cálculos:`, {
    //   closedPurchases,
    //   paymentsForClosedCycle,
    //   markedPaid,
    //   requiredThisCycle,
    //   baseAdjustment,
    //   purchasesStart: fmt(purchasesStart),
    //   currentPurchases,
    //   accruedNextCycle,
    //   totalTxsWithDebtId: relevantTxs.length,
    // });
  }
  
  const requiredPaymentCompleted = requiredThisCycle !== null && requiredThisCycle === 0;
  
  // Calcular fecha de pago y estado
  const nextPaymentDate = getNextPaymentDate(debt);
  const paymentStatus = getPaymentStatus(nextPaymentDate);

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

        {/* Detalles de pago - Solo si hay configuración de ciclos o pago mínimo */}
        {(hasStatementConfig || debt.minimumPayment || debt.paymentDueDay || nextPaymentDate || debt.interestRate) && (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-2">
            <div className="grid grid-cols-2 gap-2">
              
              {/* CICLO CERRADO: Pago requerido */}
              {hasStatementConfig && requiredThisCycle !== null && (
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    {requiredPaymentCompleted ? "Pago del ciclo cubierto ✓" : "Pago requerido este ciclo"}
                  </p>
                  <div className="flex items-center gap-1">
                    {requiredPaymentCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <CurrencyDisplay
                      amount={requiredThisCycle}
                      currency={debt.currency}
                      size="sm"
                      className={cn("font-medium", requiredPaymentCompleted && "text-emerald-600")}
                    />
                  </div>
                  {closedCycleInfo && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      Compras {closedCycleInfo.start.slice(5)} al {closedCycleInfo.end.slice(5)}
                    </p>
                  )}
                  {!requiredPaymentCompleted && onMarkStatementPaid && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMarkStatementPaid(); }}
                      className="text-[9px] text-primary hover:underline cursor-pointer mt-0.5"
                    >
                      Marcar como pagado
                    </button>
                  )}
                </div>
              )}

              {/* CICLO ACTUAL: Acumulado próximo corte */}
              {hasStatementConfig && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Acumulado próximo corte</p>
                  <CurrencyDisplay
                    amount={accruedNextCycle}
                    currency={debt.currency}
                    size="sm"
                    type={accruedNextCycle > 0 ? "expense" : "neutral"}
                    className="font-medium"
                  />
                  {currentCycleInfo && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {debt.accruedNextCycleOverride != null
                        ? `Base: ${debt.accruedNextCycleOverride.toLocaleString()} + compras − abonos`
                        : `Compras − abonos ${currentCycleInfo.start.slice(5)} al ${currentCycleInfo.end.slice(5)}`}
                    </p>
                  )}
                  {onEditAccruedNextCycle && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditAccruedNextCycle(); }}
                      className="text-[9px] text-primary hover:underline cursor-pointer"
                    >
                      {debt.accruedNextCycleOverride != null ? "Editar / Resetear" : "Ajustar base"}
                    </button>
                  )}
                </div>
              )}

              {/* Fallback: Pago mínimo (sin configuración de ciclos) */}
              {!hasStatementConfig && debt.minimumPayment && (
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

              {/* Fecha límite de pago */}
              {nextPaymentDate && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Fecha límite de pago</p>
                  <div className="flex items-center gap-1">
                    {paymentStatus === "overdue" && <AlertCircle className="w-3 h-3 text-red-500" />}
                    {paymentStatus === "warning" && <Calendar className="w-3 h-3 text-amber-500" />}
                    {paymentStatus === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <p className={cn(
                      "text-xs font-medium",
                      paymentStatus === "overdue" && "text-red-500",
                      paymentStatus === "warning" && "text-amber-500"
                    )}>
                      {formatPaymentDueDate(nextPaymentDate)}
                    </p>
                  </div>
                  {paymentStatus === "overdue" && <p className="text-[10px] text-red-500">Vencido</p>}
                  {paymentStatus === "warning" && <p className="text-[10px] text-amber-500">Próximo a vencer</p>}
                </div>
              )}

              {/* Fallback: Solo día de pago */}
              {!nextPaymentDate && debt.paymentDueDay && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Día de pago</p>
                  <p className="text-xs font-medium">Día {debt.paymentDueDay}</p>
                </div>
              )}
            </div>

            {/* Tasa de interés */}
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
