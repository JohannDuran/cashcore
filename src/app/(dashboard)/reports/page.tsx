"use client";

import { useState, useMemo } from "react";
import { useCashCoreStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  PieChart,
  Activity,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type Period = "7d" | "30d" | "90d" | "12m" | "all";

const periodLabels: Record<Period, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  "12m": "12 meses",
  all: "Todo",
};

export default function ReportsPage() {
  const { transactions, categories, wallets } = useCashCoreStore();
  const [period, setPeriod] = useState<Period>("30d");

  // Filter transactions by period
  const filtered = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(0);
    }
    return transactions.filter((t) => new Date(t.date) >= startDate);
  }, [transactions, period]);

  // Summary stats
  const summary = useMemo(() => {
    const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const txCount = filtered.length;
    const avgDaily = expense / (period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365);
    return { income, expense, net: income - expense, txCount, avgDaily };
  }, [filtered, period]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || "Otro",
          value: amount,
          color: cat?.color || "#64748B",
          icon: cat?.icon || "MoreHorizontal",
          percentage: summary.expense > 0 ? Math.round((amount / summary.expense) * 100) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filtered, categories, summary.expense]);

  // Income category breakdown
  const incomeCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    filtered
      .filter((t) => t.type === "income")
      .forEach((t) => {
        map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          name: cat?.name || "Otro",
          value: amount,
          color: cat?.color || "#64748B",
          icon: cat?.icon || "MoreHorizontal",
          percentage: summary.income > 0 ? Math.round((amount / summary.income) * 100) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filtered, categories, summary.income]);

  // Daily cash flow for area chart
  const dailyCashFlow = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filtered.forEach((t) => {
      const dateStr = String(t.date).split("T")[0];

      const existing = map.get(dateStr) || { income: 0, expense: 0 };
      if (t.type === "income") existing.income += t.amount;
      if (t.type === "expense") existing.expense += t.amount;
      map.set(dateStr, existing);
    });
    return Array.from(map.entries())
      .map(([date, vals]) => ({
        date: new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
        fullDate: date,
        income: vals.income,
        expense: vals.expense,
        net: vals.income - vals.expense,
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [filtered]);

  // Spending by wallet
  const walletSpending = useMemo(() => {
    const map = new Map<string, number>();
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map.set(t.walletId, (map.get(t.walletId) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([wId, amount]) => {
        const wallet = wallets.find((w) => w.id === wId);
        return {
          name: wallet?.name || "Desconocido",
          amount,
          color: wallet?.color || "#64748B",
          icon: wallet?.icon || "Wallet",
          percentage: summary.expense > 0 ? Math.round((amount / summary.expense) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, wallets, summary.expense]);

  // Top transactions
  const topExpenses = useMemo(() => {
    return filtered
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filtered]);

  function handleExportCSV() {
    const headers = ["Fecha", "Tipo", "Categoría", "Descripción", "Monto", "Wallet"];
    const rows = filtered.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const wallet = wallets.find((w) => w.id === t.walletId);
      return [
        t.date,
        t.type === "income" ? "Ingreso" : t.type === "expense" ? "Gasto" : "Transferencia",
        cat?.name || "",
        t.description,
        t.amount.toFixed(2),
        wallet?.name || "",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashcore-reporte-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border border-border rounded-xl p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display">Reportes</h2>
          <p className="text-sm text-muted-foreground">Analiza tus finanzas en detalle</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer",
              period === p
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            <CurrencyDisplay amount={summary.income} type="income" size="md" className="font-bold" />
            <p className="text-[10px] text-muted-foreground mt-1">{incomeCategoryData.length} fuentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Gastos</p>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <CurrencyDisplay amount={summary.expense} type="expense" size="md" className="font-bold" />
            <p className="text-[10px] text-muted-foreground mt-1">{categoryData.length} categorías</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Balance neto</p>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                summary.net >= 0 ? "bg-primary/10" : "bg-rose-500/10"
              )}>
                {summary.net >= 0
                  ? <ArrowUpRight className="w-4 h-4 text-primary" />
                  : <ArrowDownRight className="w-4 h-4 text-rose-500" />
                }
              </div>
            </div>
            <CurrencyDisplay
              amount={summary.net}
              type={summary.net >= 0 ? "income" : "expense"}
              size="md"
              className="font-bold"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{summary.txCount} transacciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Gasto diario prom.</p>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <CurrencyDisplay amount={summary.avgDaily} size="md" className="font-bold" />
            <p className="text-[10px] text-muted-foreground mt-1">promedio del periodo</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Cash Flow Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Flujo de efectivo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {dailyCashFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyCashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6aab8e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6aab8e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" name="Ingresos" stroke="#6aab8e" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="expense" name="Gastos" stroke="#F43F5E" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                Sin datos para este periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Gastos por categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={220}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-xl p-3 shadow-xl">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(data.value)} ({data.percentage}%)</p>
                          </div>
                        );
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                  {categoryData.slice(0, 6).map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs truncate flex-1">{cat.name}</span>
                      <span className="text-xs font-medium text-muted-foreground">{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Sin gastos en este periodo
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Income vs Expense Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Ingresos vs Gastos diarios
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {dailyCashFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyCashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="income" name="Ingresos" fill="#6aab8e" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="expense" name="Gastos" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                Sin datos para este periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Spending Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Gastos por wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {walletSpending.map((w) => (
                <div key={w.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${w.color}20` }}
                      >
                        <IconRenderer name={w.icon} size={16} />
                      </div>
                      <span className="text-sm font-medium">{w.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(w.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{w.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${w.percentage}%`,
                        backgroundColor: w.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              {walletSpending.length === 0 && (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin gastos en este periodo
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Expenses & Income Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Top 5 gastos del periodo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {topExpenses.map((tx, i) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                const wallet = wallets.find((w) => w.id === tx.walletId);
                return (
                  <div key={tx.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat?.color || "#64748B"}15` }}
                    >
                      <IconRenderer name={cat?.icon || "MoreHorizontal"} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cat?.name} · {wallet?.name} · {formatDate(tx.date, { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <CurrencyDisplay amount={tx.amount} type="expense" size="sm" className="font-semibold shrink-0" />
                  </div>
                );
              })}
              {topExpenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Sin gastos en este periodo</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Sources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Fuentes de ingreso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {incomeCategoryData.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <IconRenderer name={cat.icon} size={16} />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{cat.name}</span>
                        <p className="text-[10px] text-muted-foreground">{cat.percentage}% del total</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      +{formatCurrency(cat.value)}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              {incomeCategoryData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Sin ingresos en este periodo</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
