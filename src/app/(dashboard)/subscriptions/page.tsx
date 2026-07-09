"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCashCoreStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { currencies } from "@/lib/constants";
import type { Currency } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Plus,
  Calendar,
  TrendingUp,
  Repeat,
  DollarSign,
  CalendarDays,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
} from "lucide-react";
import { SubscriptionFormModal } from "@/components/subscriptions/subscription-form";
import { PlatformLogo } from "@/components/shared/platform-logo";
import { updateSubscriptionAction } from "@/app/actions/subscription.actions";

const cycleLabels: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

type SortField = "nextBillDate" | "amount" | "name" | "wallet";
type SortDirection = "asc" | "desc";

const sortLabels: Record<SortField, string> = {
  nextBillDate: "Próximo cobro",
  amount: "Monto",
  name: "Nombre",
  wallet: "Wallet",
};

type ExchangeRatesResponse = {
  target: Currency;
  rates: Partial<Record<Currency, number>>;
};

type ExchangeRateState = {
  target: Currency;
  rates: Partial<Record<Currency, number>>;
  error: string | null;
};

function getEffectiveNextBillDate(nextBillDate: string, billingCycle: string, referenceDate: Date): Date {
  const billDate = new Date(nextBillDate);
  billDate.setHours(0, 0, 0, 0);

  if (billDate >= referenceDate) return billDate;

  const next = new Date(billDate);
  while (next < referenceDate) {
    if (billingCycle === "weekly") {
      next.setDate(next.getDate() + 7);
    } else if (billingCycle === "monthly") {
      next.setMonth(next.getMonth() + 1);
    } else if (billingCycle === "yearly") {
      next.setFullYear(next.getFullYear() + 1);
    }
  }
  return next;
}

export default function SubscriptionsPage() {
  const { subscriptions, categories, wallets, user, setActiveModal, setEditingItem, updateSubscription } = useCashCoreStore();
  const defaultCurrency = user?.defaultCurrency || "MXN";
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(defaultCurrency);
  const [exchangeRateState, setExchangeRateState] = useState<ExchangeRateState>({
    target: defaultCurrency,
    rates: { [defaultCurrency]: 1 },
    error: null,
  });
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const now = today.getTime();
  const hasAdvanced = useRef(false);
  const [sortField, setSortField] = useState<SortField>("nextBillDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Auto-advance past-due subscriptions to the next billing date
  useEffect(() => {
    if (hasAdvanced.current || !user?.id) return;
    hasAdvanced.current = true;

    subscriptions.forEach((sub) => {
      if (!sub.isActive || !sub.nextBillDate) return;

      const billDate = new Date(sub.nextBillDate);
      billDate.setHours(0, 0, 0, 0);

      if (billDate >= today) return;

      const effective = getEffectiveNextBillDate(sub.nextBillDate, sub.billingCycle, today);
      const newDate = effective.toISOString();
      updateSubscription(sub.id, { nextBillDate: newDate });
      updateSubscriptionAction(user.id, sub.id, { nextBillDate: newDate });
    });
  }, [subscriptions, user, updateSubscription, today]);

  const activeSubs = useMemo(
    () => subscriptions.filter((subscription) => subscription.isActive),
    [subscriptions]
  );

  const inactiveSubs = useMemo(
    () => subscriptions.filter((subscription) => !subscription.isActive),
    [subscriptions]
  );

  const exchangeSourceKey = useMemo(() => {
    const sourceCurrencies = new Set<Currency>([displayCurrency]);
    activeSubs.forEach((subscription) => sourceCurrencies.add(subscription.currency));
    return Array.from(sourceCurrencies).sort().join(",");
  }, [activeSubs, displayCurrency]);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadExchangeRates() {
      try {
        const params = new URLSearchParams({
          to: displayCurrency,
          from: exchangeSourceKey,
        });

        const response = await fetch(`/api/exchange-rates?${params.toString()}`);
        if (!response.ok) {
          throw new Error("No se pudieron obtener los tipos de cambio");
        }

        const data = (await response.json()) as ExchangeRatesResponse;
        if (data.target !== displayCurrency) {
          throw new Error("La moneda recibida no coincide con la solicitada");
        }

        if (!shouldIgnore) {
          setExchangeRateState({
            target: data.target,
            rates: { ...data.rates, [data.target]: 1 },
            error: null,
          });
        }
      } catch (error) {
        if (!shouldIgnore) {
          setExchangeRateState({
            target: displayCurrency,
            rates: { [displayCurrency]: 1 },
            error: error instanceof Error ? error.message : "No se pudieron obtener los tipos de cambio",
          });
        }
      }
    }

    void loadExchangeRates();

    return () => {
      shouldIgnore = true;
    };
  }, [displayCurrency, exchangeSourceKey]);

  /** Convert any amount to the selected display currency */
  const convert = useCallback(
    (amount: number, from: Currency) => {
      if (from === displayCurrency) {
        return amount;
      }

      if (exchangeRateState.target === displayCurrency) {
        const rate = exchangeRateState.rates[from];
        if (typeof rate === "number") {
          return amount * rate;
        }
      }

      return convertCurrency(amount, from, displayCurrency);
    },
    [displayCurrency, exchangeRateState.rates, exchangeRateState.target]
  );

  const sortedSubs = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...activeSubs].sort((a, b) => {
      switch (sortField) {
        case "nextBillDate":
          return dir * (
            getEffectiveNextBillDate(a.nextBillDate, a.billingCycle, today).getTime() -
            getEffectiveNextBillDate(b.nextBillDate, b.billingCycle, today).getTime()
          );
        case "amount":
          return dir * (convert(a.amount, a.currency) - convert(b.amount, b.currency));
        case "name":
          return dir * a.name.localeCompare(b.name, "es");
        case "wallet": {
          const walletA = wallets.find((w) => w.id === a.walletId)?.name ?? "";
          const walletB = wallets.find((w) => w.id === b.walletId)?.name ?? "";
          return dir * walletA.localeCompare(walletB, "es");
        }
        default:
          return 0;
      }
    });
  }, [activeSubs, sortField, sortDirection, wallets, convert, today]);

  const summary = useMemo(() => {
    const monthlyTotal = activeSubs.reduce((sum, s) => {
      let monthly = s.amount;
      if (s.billingCycle === "weekly") monthly = s.amount * 4.33;
      if (s.billingCycle === "yearly") monthly = s.amount / 12;
      return sum + convert(monthly, s.currency);
    }, 0);

    const yearlyTotal = monthlyTotal * 12;

    const nextBill = activeSubs
      .map((s) => ({
        ...s,
        effectiveDate: getEffectiveNextBillDate(s.nextBillDate, s.billingCycle, today),
      }))
      .filter((s) => s.effectiveDate.getTime() >= now)
      .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())[0];
    const daysToNext = nextBill
      ? Math.ceil((nextBill.effectiveDate.getTime() - now) / (1000 * 60 * 60 * 24))
      : null;

    return { monthlyTotal, yearlyTotal, nextBill, daysToNext, count: activeSubs.length };
  }, [activeSubs, convert, now, today]);

  // Group by category
  const groupedSubs = useMemo(() => {
    const map = new Map<string, typeof activeSubs>();
    activeSubs.forEach((s) => {
      const existing = map.get(s.categoryId) || [];
      existing.push(s);
      map.set(s.categoryId, existing);
    });
    return Array.from(map.entries()).map(([catId, subs]) => {
      const cat = categories.find((c) => c.id === catId);
      const total = subs.reduce((sum, s) => sum + convert(s.amount, s.currency), 0);
      return { catId, catName: cat?.name || "Otro", catColor: cat?.color || "#64748B", subs, total };
    });
  }, [activeSubs, categories, convert]);

  // Upcoming bills: next 3 after the closest one shown in the summary card
  const upcomingBills = useMemo(() => {
    return [...activeSubs]
      .map((s) => ({
        ...s,
        effectiveDate: getEffectiveNextBillDate(s.nextBillDate, s.billingCycle, today),
      }))
      .filter((s) => !(summary.nextBill && s.id === summary.nextBill.id))
      .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
      .slice(0, 3);
  }, [activeSubs, today, summary.nextBill]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Suscripciones</h2>
          <p className="text-sm text-muted-foreground">
            {summary.count} suscripciones activas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as Currency)}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingItem(null);
              setActiveModal("subscription-form");
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva suscripción</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Costo mensual</p>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <p className="text-base font-bold tabular-nums">
              {formatCurrency(summary.monthlyTotal, displayCurrency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Costo anual</p>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-base font-bold tabular-nums">
              {formatCurrency(summary.yearlyTotal, displayCurrency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Servicios</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Repeat className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div className="flex justify-evenly">
              <div>
                <p className="text-xl font-bold">{summary.count}</p>
                <p className="text-[10px] text-muted-foreground">activos</p>
              </div>
              <div>
                <p className="text-xl font-bold">{inactiveSubs.length}</p>
                <p className="text-[10px] text-muted-foreground">inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Próx. cobro</p>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-violet-500" />
              </div>
            </div>
            {summary.nextBill ? (
              <>
                <p className="text-sm font-bold truncate">{summary.nextBill.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  en {summary.daysToNext} días · {formatCurrency(convert(summary.nextBill.amount, summary.nextBill.currency), displayCurrency)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* All Subscriptions */}
        <div className="lg:col-span-2 space-y-4">
          {activeSubs.length === 0 ? (
            <EmptyState
              icon="CreditCard"
              title="Sin suscripciones"
              description="Agrega tus suscripciones para visualizar cuánto gastas mensualmente en servicios recurrentes."
              actionLabel="Agregar suscripción"
              onAction={() => {}}
            />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Tus suscripciones
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                      <SelectTrigger className="h-7 text-[11px] w-[130px] gap-1">
                        <ArrowUpDown className="w-3 h-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(sortLabels) as [SortField, string][]).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                      title={sortDirection === "asc" ? "Ascendente" : "Descendente"}
                    >
                      {sortDirection === "asc" ? (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownNarrowWide className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {sortedSubs.map((sub, idx) => {
                    const effectiveDate = getEffectiveNextBillDate(sub.nextBillDate, sub.billingCycle, today);
                    const daysUntil = Math.ceil(
                      (effectiveDate.getTime() - now) / (1000 * 60 * 60 * 24)
                    );
                    const converted = convert(sub.amount, sub.currency);
                    const isDifferentCurrency = sub.currency !== displayCurrency;

                    return (
                      <div
                        key={sub.id}
                        className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors group px-2 -mx-2"
                        onClick={() => {
                          setEditingItem(sub);
                          setActiveModal("subscription-form");
                        }}
                      >
                        <div className="flex items-center gap-3 py-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ backgroundColor: `${sub.color}15` }}
                          >
                            <PlatformLogo sub={sub} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{sub.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {cycleLabels[sub.billingCycle]}
                              </Badge>
                              {sub.isDomiciliado && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                                  Domiciliado{sub.walletId && ` · ${wallets.find((w) => w.id === sub.walletId)?.name ?? ""}`}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {daysUntil <= 7 ? (
                                  <span className="text-amber-500 font-medium">en {daysUntil} días</span>
                                ) : (
                                  `en ${daysUntil} días`
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">
                              {formatCurrency(converted, displayCurrency)}
                            </p>
                            {isDifferentCurrency && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatCurrency(sub.amount, sub.currency)}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              /{sub.billingCycle === "yearly" ? "año" : "mes"}
                            </p>
                          </div>
                        </div>
                        {idx < sortedSubs.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inactive Subscriptions */}
          {inactiveSubs.length > 0 && (
            <Card className="opacity-80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  Suscripciones inactivas
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {inactiveSubs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {inactiveSubs.map((sub, idx) => {
                    const converted = convert(sub.amount, sub.currency);
                    const isDifferentCurrency = sub.currency !== displayCurrency;

                    return (
                      <div
                        key={sub.id}
                        className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors group px-2 -mx-2"
                        onClick={() => {
                          setEditingItem(sub);
                          setActiveModal("subscription-form");
                        }}
                      >
                        <div className="flex items-center gap-3 py-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden grayscale"
                            style={{ backgroundColor: `${sub.color}15` }}
                          >
                            <PlatformLogo sub={sub} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-muted-foreground">{sub.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {cycleLabels[sub.billingCycle]}
                              </Badge>
                              {sub.isDomiciliado && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                                  Domiciliado{sub.walletId && ` · ${wallets.find((w) => w.id === sub.walletId)?.name ?? ""}`}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-muted-foreground">
                              {formatCurrency(converted, displayCurrency)}
                            </p>
                            {isDifferentCurrency && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatCurrency(sub.amount, sub.currency)}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              /{sub.billingCycle === "yearly" ? "año" : "mes"}
                            </p>
                          </div>
                        </div>
                        {idx < inactiveSubs.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Upcoming & Breakdown */}
        <div className="space-y-4">
          {/* Upcoming Bills Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Próximos cobros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {upcomingBills.map((sub) => {
                  const date = sub.effectiveDate;
                  return (
                    <div key={sub.id} className="flex items-center gap-3">
                      <div className="flex flex-col items-center w-10 shrink-0">
                        <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {date.toLocaleDateString("es-MX", { month: "short" })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sub.name}</p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">
                        {formatCurrency(convert(sub.amount, sub.currency), displayCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Por categoría
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {groupedSubs.map((group) => (
                  <div key={group.catId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{group.catName}</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(group.total, displayCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.subs.map((s) => (
                        <div
                          key={s.id}
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${s.color}20` }}
                          title={s.name}
                        >
                          <IconRenderer name={s.icon} size={12} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SubscriptionFormModal />
    </div>
  );
}
