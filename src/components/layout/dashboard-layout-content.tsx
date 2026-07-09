"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TransactionFormModal } from "@/components/transactions/transaction-form";
import { useCashCoreStore } from "@/store";
import { cn } from "@/lib/utils";

export function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useCashCoreStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300",
          "lg:ml-[260px]",
          sidebarCollapsed && "lg:ml-[72px]"
        )}
      >
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
      <TransactionFormModal />
    </div>
  );
}
