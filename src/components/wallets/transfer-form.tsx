"use client";

import { useState } from "react";
import { useCashCoreStore } from "@/store";
import { generateId, getLocalDateInputValue, getWalletEffectiveBalance } from "@/lib/utils";
import { createTransactionAction } from "@/app/actions/transaction.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function TransferFormModal() {
  const { activeModal, setActiveModal, wallets, addTransaction, replaceTransactionId, user } = useCashCoreStore();

  const isOpen = activeModal === "transfer-form";
  const activeWallets = wallets.filter((w) => !w.isArchived);

  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalDateInputValue);

  function handleClose() {
    setActiveModal(null);
    setFromWalletId("");
    setToWalletId("");
    setAmount("");
    setDescription("");
    setDate(getLocalDateInputValue());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!fromWalletId || !toWalletId) {
      toast.error("Selecciona origen y destino");
      return;
    }
    if (fromWalletId === toWalletId) {
      toast.error("Los wallets deben ser diferentes");
      return;
    }

    const fromWallet = wallets.find((w) => w.id === fromWalletId);
    const availableBalance = fromWallet ? getWalletEffectiveBalance(fromWallet) : 0;
    if (numAmount > availableBalance) {
      toast.error(`Fondos insuficientes. Disponible: ${availableBalance.toFixed(2)} ${fromWallet?.currency || "MXN"}`);
      return;
    }

    const generatedId = generateId();
    const txData = {
      type: "transfer" as const,
      amount: Number(amount),
      currency: fromWallet?.currency || "MXN",
      walletId: fromWalletId,
      userId: user?.id || "",
      categoryId: "cat-transfer",
      description: description || "Transferencia",
      date,
      isRecurring: false,
      tags: [],
      transferToWalletId: toWalletId,
    };

    addTransaction({ ...txData, id: generatedId });
    createTransactionAction({ ...txData, id: generatedId }).then((res) => {
      if (!res.success) {
        toast.error("Error al guardar transferencia en la nube");
      } else if (res.data?.id) {
        replaceTransactionId(generatedId, res.data.id);
      }
    }).catch(err => {
      console.error(err);
      toast.error("Error al guardar transferencia en la nube");
    });

    toast.success("Transferencia realizada");
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[420px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir entre wallets</DialogTitle>
          <DialogDescription>Mueve dinero de un wallet a otro</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Wallet origen</Label>
            <Select value={fromWalletId} onValueChange={setFromWalletId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona origen" />
              </SelectTrigger>
              <SelectContent>
                {activeWallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                      {w.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Wallet destino</Label>
            <Select value={toWalletId} onValueChange={setToWalletId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona destino" />
              </SelectTrigger>
              <SelectContent>
                {activeWallets
                  .filter((w) => w.id !== fromWalletId)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                        {w.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transfer-amount">Monto</Label>
            <Input
              id="transfer-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="transfer-desc">Descripción</Label>
            <Input
              id="transfer-desc"
              placeholder="Ej: Retiro cajero"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="transfer-date">Fecha</Label>
            <Input
              id="transfer-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Transferir
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
