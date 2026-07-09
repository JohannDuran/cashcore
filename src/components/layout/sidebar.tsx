"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCashCoreStore } from "@/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  BarChart3,
  Target,
  CreditCard,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/budgets", label: "Presupuestos", icon: PieChart },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/subscriptions", label: "Suscripciones", icon: CreditCard },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useCashCoreStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  console.log("Sidebar - user desde store:", user);
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out fixed left-0 top-0 z-40",
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-16 px-4", sidebarCollapsed ? "justify-center" : "")}>
          <Logo size={sidebarCollapsed ? "sm" : "md"} showText={!sidebarCollapsed} />
        </div>

        <Separator className="mx-4 w-auto" />

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "")} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        <Separator className="mx-4 w-auto" />

        {/* User + Collapse */}
        <div className="p-3 space-y-2">
          <div className={cn("flex items-center gap-3 px-3 py-2", sidebarCollapsed && "justify-center")}>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">{user?.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "Cargando..."}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size={sidebarCollapsed ? "icon" : "default"}
            onClick={toggleSidebar}
            className={cn("w-full text-muted-foreground", sidebarCollapsed && "mx-auto")}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="ml-2">Colapsar</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
