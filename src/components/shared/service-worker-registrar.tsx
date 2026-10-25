"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    // A tab opened before a deploy can still hold an old Server Action ID.
    // Reload once when Next reports that the action no longer exists.
    const recoverFromStaleAction = () => {
      const key = "cashcore:server-action-recovery";
      const lastRecovery = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - lastRecovery < 10_000) return;
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    };
    const isStaleActionError = (value: unknown) =>
      String(value instanceof Error ? value.message : value).includes(
        "Failed to find Server Action"
      );
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isStaleActionError(event.reason)) return;
      event.preventDefault();
      recoverFromStaleAction();
    };
    const onError = (event: ErrorEvent) => {
      if (isStaleActionError(event.error || event.message)) {
        recoverFromStaleAction();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    // Cuando el nuevo service worker toma control, recargamos UNA vez para
    // descartar el HTML viejo (que apunta a Server Actions de un build anterior).
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        // Buscar actualizaciones del SW al cargar.
        registration.update().catch(() => {});

        // Si ya hay un SW esperando, pedirle que se active de inmediato.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Cuando se detecta un SW nuevo instalándose, activarlo en cuanto esté listo.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
