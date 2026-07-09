"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCashCoreStore } from "@/store";
import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Plus,
  MoreHorizontal,
  PieChart,
  BarChart3,
  Target,
  CreditCard,
  Settings,
  LogOut,
  X,
} from "lucide-react";

const primaryNav = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  // FAB goes here (index 2)
  { href: "/wallets", label: "Wallets", icon: Wallet },
];

const moreNav = [
  { href: "/budgets", label: "Presupuestos", icon: PieChart },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/subscriptions", label: "Suscripciones", icon: CreditCard },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveModal, user, logout } = useCashCoreStore();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreNav.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );

  const handleLogout = () => {
    setShowMore(false);
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowMore(false)}
        >
          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-3xl pb-20 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <p className="text-sm font-semibold text-foreground">Más opciones</p>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav items */}
            <div className="px-3 space-y-0.5">
              {moreNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Separator + Logout */}
            <div className="mx-5 my-2 h-px bg-border" />
            <div className="px-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all w-full cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
                {user?.name && (
                  <span className="ml-auto text-xs text-muted-foreground font-normal">{user.name}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 h-16">
          {/* Dashboard */}
          {primaryNav.slice(0, 2).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-[56px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* FAB */}
          <button
            onClick={() => setActiveModal("transaction-form")}
            className="relative -top-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6aab8e] to-[#6fa8c9] text-white shadow-lg shadow-[#6aab8e]/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            aria-label="Nueva transacción"
          >
            <Plus className="w-7 h-7" />
          </button>

          {/* Wallets */}
          {primaryNav.slice(2).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-[56px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-[56px] cursor-pointer",
              isMoreActive || showMore ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="Más opciones"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
