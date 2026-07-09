"use client";

import { useEffect, useRef } from "react";
import { useCashCoreStore } from "@/store";

export function StoreHydrator({ data }: { data: any }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && data) {
      useCashCoreStore.setState({
        user: data.user,
        wallets: data.wallets,
        transactions: data.transactions,
        budgets: data.budgets,
        categories: data.categories,
        tags: data.tags,
        goals: data.goals,
        subscriptions: data.subscriptions,
      });
      initialized.current = true;
    }
  }, [data]);

  return null;
}
