/**
 * Server-side Web Push utilities
 * Uses web-push library to send push notifications
 */

import webPush from "web-push";

// Initialize VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:noreply@cashcore.app";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  type?: string;
  id?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  renotify?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  vibrate?: number[];
  data?: Record<string, unknown>;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { success: false, error: "VAPID keys not configured" };
  }

  const pushSubscription: webPush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-72x72.png",
    tag: payload.tag,
    url: payload.url || "/dashboard",
    type: payload.type,
    id: payload.id,
    requireInteraction: payload.requireInteraction ?? false,
    silent: payload.silent ?? false,
    renotify: payload.renotify ?? false,
    actions: payload.actions || [],
    vibrate: payload.vibrate || [100, 50, 100],
    ...payload.data,
  });

  try {
    await webPush.sendNotification(pushSubscription, notificationPayload);
    return { success: true };
  } catch (error) {
    const webPushError = error as webPush.WebPushError;
    
    // Handle specific error codes
    if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
      // Subscription has expired or is invalid
      return { 
        success: false, 
        error: "Subscription expired or invalid",
        statusCode: webPushError.statusCode 
      };
    }

    return { 
      success: false, 
      error: webPushError.message || "Failed to send notification",
      statusCode: webPushError.statusCode
    };
  }
}

/**
 * Send push notifications to multiple subscriptions
 */
export async function sendPushToMultiple(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{
  sent: number;
  failed: number;
  expiredEndpoints: string[];
}> {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      // Check if subscription expired
      if (
        result.status === "fulfilled" && 
        (result.value.statusCode === 410 || result.value.statusCode === 404)
      ) {
        expiredEndpoints.push(subscriptions[index].endpoint);
      }
    }
  });

  return { sent, failed, expiredEndpoints };
}

/**
 * Check if VAPID keys are configured
 */
export function isWebPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

/**
 * Get public VAPID key for client
 */
export function getPublicVapidKey(): string | null {
  return vapidPublicKey || null;
}
