"use client";

import { useCashCoreStore } from "@/store";
import { WalletCard } from "@/components/wallets/wallet-card";
import { WalletFormModal } from "@/components/wallets/wallet-form";
import { TransferFormModal } from "@/components/wallets/transfer-form";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftRight,
  CreditCard,
  Plus,
  Scale,
  Wallet as WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Wallet } from "@/types";

function isDebtWallet(wallet: Wallet) {
  return wallet.type === "credit" || wallet.type === "loan";
}

export default function WalletsPage() {
  const { wallets, transactions, setActiveModal, setEditingItem, deleteWallet } = useCashCoreStore();
  const [deleteTarget, setDeleteTarget] = useState<Wallet | null>(null);
  const [currentDate] = useState(() => new Date());

  const activeWallets = wallets.filter((w) => !w.isArchived);
  const assetWallets = activeWallets.filter((wallet) => !isDebtWallet(wallet));
  const debtWallets = activeWallets.filter(isDebtWallet);
  const availableBalance = assetWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const debtBalanceInFavor = debtWallets.reduce(
    (sum, wallet) => sum + Math.max(wallet.balance, 0),
    0
  );
  const debtTotal = debtWallets.reduce(
    (sum, wallet) => sum + Math.max(-wallet.balance, 0),
    0
  );
  const creditAvailable = debtWallets.reduce((sum, wallet) => {
    if (wallet.type !== "credit" || !wallet.creditLimit) return sum;
    const debt = Math.max(-wallet.balance, 0);
    const balanceInFavor = Math.max(wallet.balance, 0);
    return sum + Math.max(wallet.creditLimit - debt + balanceInFavor, 0);
  }, 0);
  const netBalance = availableBalance + debtBalanceInFavor - debtTotal;

  function handleEdit(wallet: Wallet) {
    setEditingItem(wallet);
    setActiveModal("wallet-form");
  }

  function handleDelete() {
    if (deleteTarget) {
      deleteWallet(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Wallet eliminado");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Wallets</h2>
          <p className="text-sm text-muted-foreground">{activeWallets.length} cuentas activas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveModal("transfer-form")} className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden sm:inline">Transferir</span>
          </Button>
          <Button onClick={() => setActiveModal("wallet-form")} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo wallet</span>
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Dinero disponible</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <CurrencyDisplay amount={availableBalance} size="lg" className="block" />
            <p className="text-xs text-muted-foreground mt-1">
              Efectivo, banco, ahorro y wallets no crédito
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Deuda en crédito/préstamos</p>
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <CurrencyDisplay amount={debtTotal} type="expense" size="lg" className="block" />
            <p className="text-xs text-muted-foreground mt-1">
              Crédito disponible: <CurrencyDisplay amount={creditAvailable} size="sm" />
            </p>
          </CardContent>
        </Card>

        <Card className={netBalance < 0 ? "border-rose-500/20" : "border-sky-500/20"}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Balance neto</p>
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Scale className="w-4 h-4 text-sky-500" />
              </div>
            </div>
            <CurrencyDisplay
              amount={netBalance}
              showSign
              size="lg"
              className={netBalance < 0 ? "block text-expense" : "block"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Disponible + saldo a favor - deuda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Grid */}
      {activeWallets.length === 0 ? (
        <EmptyState
          icon="Wallet"
          title="Sin wallets"
          description="Agrega tu primera cuenta o billetera para empezar a registrar transacciones."
          actionLabel="Crear wallet"
          onAction={() => setActiveModal("wallet-form")}
        />
      ) : (
        <div className="space-y-6">
          {assetWallets.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Dinero y cuentas</h3>
                <p className="text-xs text-muted-foreground">
                  Cuentas que representan dinero disponible o guardado.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assetWallets.map((wallet) => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    onEdit={() => handleEdit(wallet)}
                    currentDate={currentDate}
                    transactions={transactions}
                  />
                ))}
              </div>
            </section>
          )}

          {debtWallets.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Crédito, préstamos y deuda</h3>
                <p className="text-xs text-muted-foreground">
                  Tarjetas, departamentales y préstamos con saldo deudor.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {debtWallets.map((wallet) => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    onEdit={() => handleEdit(wallet)}
                    currentDate={currentDate}
                    transactions={transactions}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <WalletFormModal />
      <TransferFormModal />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las transacciones asociadas a &quot;{deleteTarget?.name}&quot;. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
