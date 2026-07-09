"use client";

import { useCashCoreStore } from "@/store";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { currencies } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Currency } from "@/types";
import { CategoryManagerCard } from "@/components/settings/category-manager-card";
import { TagManagerCard } from "@/components/settings/tag-manager-card";

export default function SettingsPage() {
  const { user, updateUser } = useCashCoreStore();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display">Configuración</h2>
        <p className="text-sm text-muted-foreground">Personaliza tu experiencia en CashCore</p>
      </div>

      {/* Fila 1 — Perfil + Preferencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
            <CardDescription>Tu información personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarFallback className="text-xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={user.name}
                  onChange={(e) => updateUser({ name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} disabled className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferencias</CardTitle>
            <CardDescription>Moneda y apariencia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Moneda principal</Label>
              <Select
                value={user.defaultCurrency}
                onValueChange={(v) => updateUser({ defaultCurrency: v as Currency })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tema</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
                        theme === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted hover:border-border"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 2 — Categorías (ancho completo) */}
      <CategoryManagerCard />

      {/* Fila 3 — Tags + Datos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TagManagerCard />

        {/* Datos + About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
            <CardDescription>Exportar o eliminar tus datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full gap-2" onClick={() => toast.success("Datos exportados (demo)")}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
              Eliminar cuenta
            </Button>
            <Separator />
            <div className="space-y-1 text-xs text-muted-foreground pt-1">
              <p>CashCore v0.1.0 · Hecho con ❤️ por Johann</p>
              <div className="flex gap-3">
                <button className="text-primary hover:underline cursor-pointer">Privacidad</button>
                <button className="text-primary hover:underline cursor-pointer">Términos</button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
