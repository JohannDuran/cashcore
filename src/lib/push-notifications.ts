/**
 * Push Notification utilities for Web Push API
 * Handles subscription management and notification sending
 */

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current notification permission state
 */
export function getPermissionState(): PushPermissionState {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermissionState;
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    return permission as PushPermissionState;
  } catch {
    return "denied";
  }
}

/**
 * Get existing push subscription
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await requestPermission();
  if (permission !== "granted") return null;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Unsubscribe from existing subscription if any
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const subscription = await getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Send subscription to server
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Remove subscription from server
 */
export async function removeSubscriptionFromServer(): Promise<boolean> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "DELETE",
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Full subscription flow: request permission, subscribe, save to server
 */
export async function enablePushNotifications(
  vapidPublicKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications not supported" };
  }

  const permission = await requestPermission();
  if (permission !== "granted") {
    return { success: false, error: "Permission denied" };
  }

  const subscription = await subscribeToPush(vapidPublicKey);
  if (!subscription) {
    return { success: false, error: "Failed to subscribe" };
  }

  const saved = await saveSubscriptionToServer(subscription);
  if (!saved) {
    return { success: false, error: "Failed to save subscription" };
  }

  return { success: true };
}

/**
 * Full unsubscription flow: unsubscribe and remove from server
 */
export async function disablePushNotifications(): Promise<{ success: boolean; error?: string }> {
  const unsubscribed = await unsubscribeFromPush();
  const removed = await removeSubscriptionFromServer();

  if (!unsubscribed && !removed) {
    return { success: false, error: "Failed to unsubscribe" };
  }

  return { success: true };
}

/**
 * Show a local notification (for testing or immediate feedback)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = getPermissionState();
  if (permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Request background sync (for manual notification check)
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ("sync" in registration) {
      // @ts-expect-error - TypeScript doesn't have complete types for Background Sync API
      await registration.sync.register("sync-notifications");
      return true;
    }

    // Fallback: send message to SW to trigger sync
    registration.active?.postMessage({ type: "REQUEST_SYNC" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Register periodic background sync (if supported)
 */
export async function registerPeriodicSync(
  intervalMinutes: number = 60
): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ("periodicSync" in registration) {
      const status = await navigator.permissions.query({
        // @ts-expect-error - TypeScript doesn't have complete types for Periodic Background Sync
        name: "periodic-background-sync",
      });

      if (status.state === "granted") {
        // @ts-expect-error - TypeScript doesn't have complete types for Periodic Background Sync
        await registration.periodicSync.register("check-notifications", {
          minInterval: intervalMinutes * 60 * 1000,
        });
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
