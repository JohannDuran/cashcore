"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Bell,
  BellOff,
  CalendarClock,
  Target,
  PiggyBank,
  CreditCard,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useCashCoreStore } from "@/store";
import { updateNotificationPreferencesAction } from "@/app/actions/notification.actions";
import {
  isPushSupported,
  getPermissionState,
  enablePushNotifications,
  disablePushNotifications,
  showLocalNotification,
  type PushPermissionState,
} from "@/lib/push-notifications";
import type { NotificationPreferences } from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";

export function NotificationPreferencesCard() {
  const { user, updateUser } = useCashCoreStore();
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<PushPermissionState>("default");
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  // Get preferences from user or use defaults
  const preferences: NotificationPreferences = user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  // Check push support and permission on mount
  useEffect(() => {
    setPushSupported(isPushSupported());
    setPermissionState(getPermissionState());

    // Fetch VAPID key
    fetch("/api/push/vapid")
      .then((res) => res.json())
      .then((data) => setVapidKey(data.publicKey))
      .catch(() => setVapidKey(null));
  }, []);

  const updatePreferences = useCallback((partial: Partial<NotificationPreferences>) => {
    if (!user) return;
    const updated = { ...preferences, ...partial };
    updateUser({ notificationPreferences: updated });
  }, [user, preferences, updateUser]);

  async function handleSave() {
    setSaving(true);
    const res = await updateNotificationPreferencesAction(preferences);
    setSaving(false);
    if (res.success) {
      toast.success("Preferencias de notificaciones guardadas");
    } else {
      toast.error("Error al guardar: " + res.error);
    }
  }

  async function handleEnablePush() {
    if (!vapidKey) {
      toast.error("Las notificaciones push no están configuradas en el servidor");
      return;
    }

    setEnablingPush(true);
    const result = await enablePushNotifications(vapidKey);
    setEnablingPush(false);

    if (result.success) {
      setPermissionState("granted");
      updatePreferences({ pushEnabled: true });
      toast.success("Notificaciones push activadas");
      
      // Show a test notification
      await showLocalNotification("¡Notificaciones activadas!", {
        body: "Recibirás alertas sobre tus finanzas aunque la app esté cerrada.",
        tag: "test-notification",
      });
    } else {
      if (result.error === "Permission denied") {
        setPermissionState("denied");
        toast.error("Permiso denegado. Actívalas desde la configuración del navegador.");
      } else {
        toast.error("Error: " + result.error);
      }
    }
  }

  async function handleDisablePush() {
    setEnablingPush(true);
    const result = await disablePushNotifications();
    setEnablingPush(false);

    if (result.success) {
      updatePreferences({ pushEnabled: false });
      toast.success("Notificaciones push desactivadas");
    } else {
      toast.error("Error al desactivar: " + result.error);
    }
  }

  if (!user) return null;

  const pushStatus = preferences.pushEnabled && permissionState === "granted";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificaciones
        </CardTitle>
        <CardDescription>
          Configura qué alertas recibir y cuándo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Notificaciones activadas</Label>
            <p className="text-sm text-muted-foreground">
              Recibe alertas sobre tus finanzas
            </p>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={(checked) => updatePreferences({ enabled: checked })}
          />
        </div>

        {preferences.enabled && (
          <>
            <Separator />

            {/* Push notifications status */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-medium">Notificaciones Push</span>
                </div>
                {pushStatus ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Activas
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <BellOff className="w-3 h-3 mr-1" />
                    Inactivas
                  </Badge>
                )}
              </div>

              {!pushSupported ? (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Tu navegador no soporta notificaciones push</span>
                </div>
              ) : permissionState === "denied" ? (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Permiso denegado. Actívalas desde la configuración de tu navegador.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {pushStatus ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisablePush}
                      disabled={enablingPush}
                    >
                      {enablingPush && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleEnablePush}
                      disabled={enablingPush || !vapidKey}
                    >
                      {enablingPush && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Activar notificaciones
                    </Button>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Las notificaciones push funcionan incluso cuando la app está cerrada
              </p>
            </div>

            <Separator />

            {/* Notification categories */}
            <Accordion type="multiple" defaultValue={["subscriptions"]} className="w-full">
              {/* Subscriptions */}
              <AccordionItem value="subscriptions">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    <span>Suscripciones</span>
                    {preferences.subscriptions.enabled && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {preferences.subscriptions.daysBefore.length} alertas
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Activar alertas de vencimiento</Label>
                    <Switch
                      checked={preferences.subscriptions.enabled}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          subscriptions: { ...preferences.subscriptions, enabled: checked },
                        })
                      }
                    />
                  </div>
                  {preferences.subscriptions.enabled && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Alertar con anticipación de:
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {[10, 7, 5, 3, 2, 1].map((days) => (
                          <Button
                            key={days}
                            variant={
                              preferences.subscriptions.daysBefore.includes(days)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => {
                              const current = preferences.subscriptions.daysBefore;
                              const updated = current.includes(days)
                                ? current.filter((d) => d !== days)
                                : [...current, days].sort((a, b) => b - a);
                              updatePreferences({
                                subscriptions: { ...preferences.subscriptions, daysBefore: updated },
                              });
                            }}
                          >
                            {days} {days === 1 ? "día" : "días"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Goals - Amount */}
              <AccordionItem value="goals">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Metas</span>
                    {(preferences.goalAmount.enabled || preferences.goalDeadline.enabled) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {(preferences.goalAmount.enabled ? 1 : 0) +
                          (preferences.goalDeadline.enabled ? 1 : 0)}{" "}
                        tipos
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-2">
                  {/* By amount */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Por monto (cerca de completar)</Label>
                      <Switch
                        checked={preferences.goalAmount.enabled}
                        onCheckedChange={(checked) =>
                          updatePreferences({
                            goalAmount: { ...preferences.goalAmount, enabled: checked },
                          })
                        }
                      />
                    </div>
                    {preferences.goalAmount.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Alertar cuando falte:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[20, 15, 10, 5, 3].map((pct) => (
                            <Button
                              key={pct}
                              variant={
                                preferences.goalAmount.percentRemaining.includes(pct)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const current = preferences.goalAmount.percentRemaining;
                                const updated = current.includes(pct)
                                  ? current.filter((p) => p !== pct)
                                  : [...current, pct].sort((a, b) => b - a);
                                updatePreferences({
                                  goalAmount: { ...preferences.goalAmount, percentRemaining: updated },
                                });
                              }}
                            >
                              {pct}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* By deadline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Por fecha límite</Label>
                      <Switch
                        checked={preferences.goalDeadline.enabled}
                        onCheckedChange={(checked) =>
                          updatePreferences({
                            goalDeadline: { ...preferences.goalDeadline, enabled: checked },
                          })
                        }
                      />
                    </div>
                    {preferences.goalDeadline.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Alertar con anticipación de:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[30, 15, 10, 7, 5, 3, 1].map((days) => (
                            <Button
                              key={days}
                              variant={
                                preferences.goalDeadline.daysBefore.includes(days)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const current = preferences.goalDeadline.daysBefore;
                                const updated = current.includes(days)
                                  ? current.filter((d) => d !== days)
                                  : [...current, days].sort((a, b) => b - a);
                                updatePreferences({
                                  goalDeadline: { ...preferences.goalDeadline, daysBefore: updated },
                                });
                              }}
                            >
                              {days} {days === 1 ? "día" : "días"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Budgets */}
              <AccordionItem value="budgets">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    <span>Presupuestos</span>
                    {preferences.budgets.enabled && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {preferences.budgets.percentUsed.length} alertas
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Alertar cuando se acerque al límite</Label>
                    <Switch
                      checked={preferences.budgets.enabled}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          budgets: { ...preferences.budgets, enabled: checked },
                        })
                      }
                    />
                  </div>
                  {preferences.budgets.enabled && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Alertar al usar:
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {[75, 80, 85, 90, 95, 100].map((pct) => (
                          <Button
                            key={pct}
                            variant={
                              preferences.budgets.percentUsed.includes(pct)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => {
                              const current = preferences.budgets.percentUsed;
                              const updated = current.includes(pct)
                                ? current.filter((p) => p !== pct)
                                : [...current, pct].sort((a, b) => a - b);
                              updatePreferences({
                                budgets: { ...preferences.budgets, percentUsed: updated },
                              });
                            }}
                          >
                            {pct}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Debts */}
              <AccordionItem value="debts">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Deudas</span>
                    {(preferences.debtMilestone.enabled || preferences.debtBalance.enabled) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {(preferences.debtMilestone.enabled ? 1 : 0) +
                          (preferences.debtBalance.enabled ? 1 : 0)}{" "}
                        tipos
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-2">
                  {/* Milestones (% paid) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Hitos de pago (% pagado)</Label>
                      <Switch
                        checked={preferences.debtMilestone.enabled}
                        onCheckedChange={(checked) =>
                          updatePreferences({
                            debtMilestone: { ...preferences.debtMilestone, enabled: checked },
                          })
                        }
                      />
                    </div>
                    {preferences.debtMilestone.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Celebrar al pagar:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[25, 50, 75, 85, 90, 95, 100].map((pct) => (
                            <Button
                              key={pct}
                              variant={
                                preferences.debtMilestone.percentPaid.includes(pct)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const current = preferences.debtMilestone.percentPaid;
                                const updated = current.includes(pct)
                                  ? current.filter((p) => p !== pct)
                                  : [...current, pct].sort((a, b) => a - b);
                                updatePreferences({
                                  debtMilestone: { ...preferences.debtMilestone, percentPaid: updated },
                                });
                              }}
                            >
                              {pct}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Balance (% remaining) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Balance bajo (% restante)</Label>
                      <Switch
                        checked={preferences.debtBalance.enabled}
                        onCheckedChange={(checked) =>
                          updatePreferences({
                            debtBalance: { ...preferences.debtBalance, enabled: checked },
                          })
                        }
                      />
                    </div>
                    {preferences.debtBalance.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Alertar cuando quede:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[25, 20, 15, 10, 5, 3].map((pct) => (
                            <Button
                              key={pct}
                              variant={
                                preferences.debtBalance.percentRemaining.includes(pct)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const current = preferences.debtBalance.percentRemaining;
                                const updated = current.includes(pct)
                                  ? current.filter((p) => p !== pct)
                                  : [...current, pct].sort((a, b) => b - a);
                                updatePreferences({
                                  debtBalance: { ...preferences.debtBalance, percentRemaining: updated },
                                });
                              }}
                            >
                              {pct}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Quiet hours */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Horario silencioso</Label>
                  <p className="text-xs text-muted-foreground">
                    No recibir notificaciones en este horario
                  </p>
                </div>
                <Switch
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      quietHours: { ...preferences.quietHours, enabled: checked },
                    })
                  }
                />
              </div>
              {preferences.quietHours.enabled && (
                <div className="flex items-center gap-2">
                  <Select
                    value={preferences.quietHours.start}
                    onValueChange={(v) =>
                      updatePreferences({
                        quietHours: { ...preferences.quietHours, start: v },
                      })
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, "0") + ":00";
                        return (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">a</span>
                  <Select
                    value={preferences.quietHours.end}
                    onValueChange={(v) =>
                      updatePreferences({
                        quietHours: { ...preferences.quietHours, end: v },
                      })
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, "0") + ":00";
                        return (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar preferencias
        </Button>
      </CardContent>
    </Card>
  );
}
