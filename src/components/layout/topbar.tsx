"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Bell, CheckCircle2 } from "lucide-react";
import { useCashCoreStore } from "@/store";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transacciones",
  "/wallets": "Wallets",
  "/budgets": "Presupuestos",
  "/settings": "Configuración",
};

export function Topbar() {
  const pathname = usePathname();
  const { user } = useCashCoreStore();

  const title = pageTitles[pathname] || "CashCore";

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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {/* Demo pending notification dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h4 className="font-semibold text-sm">Notificaciones</h4>
              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">1 Nueva</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center gap-3 py-10">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">¡Estás al día!</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                  Por ahora no hay notificaciones, te avisaremos si ocurre algo nuevo.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <ThemeToggle />
      </div>
    </header>
  );
}
