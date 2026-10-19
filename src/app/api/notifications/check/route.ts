import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeNotifications } from "@/lib/notifications";
import { sendPushToMultiple, type PushPayload } from "@/lib/web-push";
import type { NotificationPreferences, AppNotification } from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";

/**
 * Check and send notifications for the current user
 * Called by Background Sync or manually
 */
export async function POST() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with all related data needed for notification computation
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscriptions: {
          where: { isActive: true },
        },
        goals: {
          where: { isCompleted: false },
        },
        budgets: {
          where: { isActive: true },
        },
        debts: {
          where: { isActive: true },
        },
        pushSubscriptions: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse notification preferences
    const preferences: NotificationPreferences = userData.notificationPreferences
      ? (userData.notificationPreferences as unknown as NotificationPreferences)
      : DEFAULT_NOTIFICATION_PREFERENCES;

    // If notifications are disabled, return empty
    if (!preferences.enabled) {
      return NextResponse.json({ notifications: [] });
    }

    // Map Prisma data to ComputeNotificationsInput format
    const notifications = computeNotifications({
      preferences,
      subscriptions: userData.subscriptions.map((s) => ({
        id: s.id,
        name: s.name,
        nextBillDate: s.nextBillDate,
        amount: s.amount,
        currency: s.currency,
      })),
      goals: userData.goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        icon: g.icon,
      })),
      budgets: userData.budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        spent: b.spent,
      })),
      debts: userData.debts.map((d) => ({
        id: d.id,
        name: d.name,
        originalAmount: d.originalAmount,
        currentBalance: d.currentBalance,
        icon: d.icon,
      })),
    });

    // If no push subscriptions or no notifications, just return the computed list
    if (userData.pushSubscriptions.length === 0 || notifications.length === 0) {
      return NextResponse.json({
        notifications: notifications.map(formatNotificationForClient),
      });
    }

    // Send push notifications for high/critical priority items
    const pushNotifications = notifications.filter(
      (n) => n.priority === "high" || n.priority === "critical"
    );

    if (pushNotifications.length > 0 && preferences.pushEnabled) {
      const subscriptionData = userData.pushSubscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      }));

      // Send each notification
      const expiredEndpoints: string[] = [];
      
      for (const notification of pushNotifications) {
        const payload = notificationToPayload(notification);
        const result = await sendPushToMultiple(subscriptionData, payload);
        expiredEndpoints.push(...result.expiredEndpoints);
      }

      // Clean up expired subscriptions
      if (expiredEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
          where: {
            endpoint: { in: expiredEndpoints },
          },
        });
      }
    }

    return NextResponse.json({
      notifications: notifications.map(formatNotificationForClient),
      pushSent: pushNotifications.length,
    });
  } catch (error) {
    console.error("Failed to check notifications:", error);
    return NextResponse.json(
      { error: "Failed to check notifications" },
      { status: 500 }
    );
  }
}

function notificationToPayload(notification: AppNotification): PushPayload {
  const typeUrls: Record<string, string> = {
    subscription_due: "/subscriptions",
    goal_amount: "/goals",
    goal_deadline: "/goals",
    budget_alert: "/budgets",
    debt_milestone: "/debts",
    debt_balance: "/debts",
  };

  return {
    title: notification.title,
    body: notification.message,
    icon: notification.icon || "/icons/icon-192x192.png",
    tag: `${notification.type}-${notification.relatedId}`,
    url: typeUrls[notification.type] || "/dashboard",
    type: notification.type,
    id: notification.id,
    requireInteraction: notification.priority === "critical",
    actions: [
      { action: "view", title: "Ver" },
      { action: "dismiss", title: "Descartar" },
    ],
  };
}

function formatNotificationForClient(notification: AppNotification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    icon: notification.icon,
    relatedId: notification.relatedId,
    createdAt: notification.createdAt.toISOString(),
  };
}
