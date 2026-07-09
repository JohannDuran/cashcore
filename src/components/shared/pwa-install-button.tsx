"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Smartphone, Share, MoreVertical, Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Win|Mac|Linux/.test(navigator.platform || "")) return "desktop";
  return "unknown";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton({ variant = "feature" }: { variant?: "feature" | "hero" }) {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    // Capture Android/Desktop install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      // Android / Desktop Chrome — native prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else {
      // iOS or no prompt available — show instructions
      setShowModal(true);
    }
  }

  if (installed) return null;

  const isHero = variant === "hero";

  return (
    <>
      <Button
        onClick={handleInstall}
        variant={isHero ? "outline" : "ghost"}
        size={isHero ? "xl" : "sm"}
        className={cn("gap-2", isHero ? "w-full sm:w-auto" : "text-primary")}
      >
        <Smartphone className={cn(isHero ? "w-5 h-5" : "w-4 h-4")} />
        {isHero ? "Instalar app" : "Instalar en tu móvil"}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Instalar CashCore
            </DialogTitle>
            <DialogDescription>
              Agrega CashCore a tu pantalla de inicio para acceso rápido sin abrir el navegador.
            </DialogDescription>
          </DialogHeader>

          {platform === "ios" && (
            <div className="space-y-4">
              <p className="text-sm font-medium">En Safari (iPhone / iPad):</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm text-muted-foreground">
                    Toca el botón <strong className="text-foreground inline-flex items-center gap-1">Compartir <Share className="w-3.5 h-3.5 inline" /></strong> en la barra inferior de Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-sm text-muted-foreground">
                    Desplázate y toca <strong className="text-foreground inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5 inline" /> Agregar a pantalla de inicio</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-sm text-muted-foreground">
                    Toca <strong className="text-foreground">Agregar</strong> en la esquina superior derecha
                  </span>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                💡 Asegúrate de abrir esta página en <strong>Safari</strong>. Chrome en iOS no soporta instalación PWA.
              </p>
            </div>
          )}

          {platform === "android" && (
            <div className="space-y-4">
              <p className="text-sm font-medium">En Chrome (Android):</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm text-muted-foreground">
                    Toca el menú <strong className="text-foreground inline-flex items-center gap-1"><MoreVertical className="w-3.5 h-3.5 inline" /></strong> (tres puntos) en la esquina superior derecha
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-sm text-muted-foreground">
                    Selecciona <strong className="text-foreground inline-flex items-center gap-1"><Download className="w-3.5 h-3.5 inline" /> Agregar a pantalla de inicio</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-sm text-muted-foreground">
                    Toca <strong className="text-foreground">Instalar</strong> en el diálogo
                  </span>
                </li>
              </ol>
            </div>
          )}

          {(platform === "desktop" || platform === "unknown") && (
            <div className="space-y-4">
              <p className="text-sm font-medium">En Chrome / Edge (escritorio):</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm text-muted-foreground">
                    Busca el ícono <strong className="text-foreground">⊕</strong> o <strong className="text-foreground">Instalar</strong> en la barra de direcciones
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-sm text-muted-foreground">
                    Haz clic y selecciona <strong className="text-foreground">Instalar</strong>
                  </span>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                💡 Para móvil, abre esta página en tu teléfono y sigue las instrucciones de iOS o Android.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
