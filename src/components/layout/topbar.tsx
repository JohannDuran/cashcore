"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle2,
  CalendarClock,
  Target,
  PiggyBank,
  CreditCard,
  Trophy,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { useCashCoreStore } from "@/store";
import { computeNotifications } from "@/lib/notifications";
import type { AppNotification, NotificationType } from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_PRIORITY_COLORS } from "@/types/notifications";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transacciones",
  "/wallets": "Wallets",
  "/budgets": "Presupuestos",
  "/goals": "Metas",
  "/subscriptions": "Suscripciones",
  "/debts": "Deudas",
  "/settings": "Configuración",
};

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  subscription_due: <CalendarClock className="w-4 h-4" />,
  goal_amount: <Target className="w-4 h-4" />,
  goal_deadline: <Target className="w-4 h-4" />,
  budget_alert: <PiggyBank className="w-4 h-4" />,
  debt_milestone: <Trophy className="w-4 h-4" />,
  debt_balance: <CreditCard className="w-4 h-4" />,
};

const notificationLinks: Record<NotificationType, string> = {
  subscription_due: "/subscriptions",
  goal_amount: "/goals",
  goal_deadline: "/goals",
  budget_alert: "/budgets",
  debt_milestone: "/debts",
  debt_balance: "/debts",
};

export function Topbar() {
  const pathname = usePathname();
  const { user, subscriptions, goals, budgets, debts } = useCashCoreStore();
  const [open, setOpen] = useState(false);

  const title = pageTitles[pathname] || "CashCore";

  // Compute notifications from current data
  const notifications = useMemo(() => {
    const prefs = user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
    
    // If globally disabled, return empty
    if (!prefs.enabled) return [];

    return computeNotifications({
      preferences: prefs,
      subscriptions: subscriptions
        .filter((s) => s.isActive)
        .map((s) => ({
          id: s.id,
          name: s.name,
          nextBillDate: new Date(s.nextBillDate),
          amount: s.amount,
          currency: s.currency,
        })),
      goals: goals
        .filter((g) => !g.isCompleted)
        .map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline ? new Date(g.deadline) : null,
          icon: g.icon,
        })),
      budgets: budgets
        .filter((b) => b.isActive)
        .map((b) => ({
          id: b.id,
          name: b.name,
          amount: b.amount,
          spent: b.spent,
        })),
      debts: debts
        .filter((d) => d.isActive)
        .map((d) => ({
          id: d.id,
          name: d.name,
          originalAmount: d.originalAmount,
          currentBalance: d.currentBalance,
          icon: d.icon,
        })),
    });
  }, [user?.notificationPreferences, subscriptions, goals, budgets, debts]);

  // Count by priority
  const criticalCount = notifications.filter((n) => n.priority === "critical").length;
  const highCount = notifications.filter((n) => n.priority === "high").length;
  const totalUrgent = criticalCount + highCount;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {user?.name ? `Hola, ${user.name} 👋` : "Cargando..."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground"
              aria-label={`Notificaciones ${notifications.length > 0 ? `(${notifications.length} pendientes)` : ""}`}
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full",
                    totalUrgent > 0
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h4 className="font-semibold text-sm">Notificaciones</h4>
              {notifications.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                  {notifications.length} {notifications.length === 1 ? "alerta" : "alertas"}
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 flex flex-col items-center justify-center text-center gap-3 py-10">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">¡Estás al día!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    No hay notificaciones pendientes. Te avisaremos si ocurre algo nuevo.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/30">
                <Link
                  href="/settings"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Configurar notificaciones →
                </Link>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <ThemeToggle />
      </div>
    </header>
  );
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const icon = notificationIcons[notification.type];
  const link = notificationLinks[notification.type];
  const priorityColor = NOTIFICATION_PRIORITY_COLORS[notification.priority];

  return (
    <Link
      href={link}
      className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors group"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          notification.priority === "critical"
            ? "bg-destructive/10 text-destructive"
            : notification.priority === "high"
            ? "bg-amber-500/10 text-amber-500"
            : notification.priority === "medium"
            ? "bg-blue-500/10 text-blue-500"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{notification.title}</p>
          {(notification.priority === "critical" || notification.priority === "high") && (
            <Badge
              variant={notification.priority === "critical" ? "destructive" : "secondary"}
              className="text-[10px] px-1.5 py-0 shrink-0"
            >
              {notification.priority === "critical" ? "Urgente" : "Alta"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
        {notification.relatedName && (
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">
            {notification.relatedName}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5" />
    </Link>
  );
}
