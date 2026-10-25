// Cambia este número solo si modificas los assets o la estrategia de caché.
// No controla la compatibilidad de Server Actions; esa la controla
// NEXT_SERVER_ACTIONS_ENCRYPTION_KEY durante el build.
const CACHE_NAME = "cashcore-v2";

// Solo cacheamos recursos verdaderamente estáticos (NO páginas HTML, porque
// el HTML contiene IDs de Server Actions que cambian en cada build y provocan
// el error "Failed to find Server Action").
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ==================== INSTALL ====================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ==================== ACTIVATE ====================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ==================== FETCH ====================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejamos GET del mismo origen. Las Server Actions son POST y NUNCA
  // deben pasar por el service worker: dejamos que vayan directo a la red.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // NUNCA interceptar documentos de navegación (páginas HTML). El HTML lleva
  // incrustados los IDs de Server Actions del build actual; servir HTML viejo
  // desde caché rompe las acciones ("Failed to find Server Action").
  // Si la red falla, solo entonces mostramos un fallback cacheado (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline") || caches.match("/"))
    );
    return;
  }

  // Network-first (sin cachear) para API, server actions y chunks de Next.
  // Los chunks de _next llevan hash en el nombre: si cambia el build, cambia
  // la URL, así que no hace falta cachearlos manualmente.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache-first SOLO para assets estáticos con extensión (imágenes, fuentes).
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2|gif|webp)$/)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ??
        fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Todo lo demás: red directa, sin caché.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "CashCore",
      body: event.data.text(),
      icon: "/icons/icon-192x192.png",
    };
  }

  const options = {
    body: data.body || "Tienes una nueva notificación",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-72x72.png",
    tag: data.tag || `cashcore-${Date.now()}`,
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    data: {
      url: data.url || "/dashboard",
      type: data.type || "general",
      id: data.id || null,
      timestamp: Date.now(),
    },
    actions: data.actions || [],
    vibrate: data.vibrate || [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "CashCore", options)
  );
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";
  const notificationType = event.notification.data?.type;
  const notificationId = event.notification.data?.id;

  // Handle action buttons
  if (event.action) {
    switch (event.action) {
      case "view":
        // Default behavior - open the URL
        break;
      case "dismiss":
        // Just close, already done above
        return;
      case "snooze":
        // TODO: Implement snooze logic if needed
        return;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          // Navigate existing window to the notification URL
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            url: urlToOpen,
            notificationType,
            notificationId,
          });
          return client.focus();
        }
      }
      // No existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ==================== NOTIFICATION CLOSE ====================
self.addEventListener("notificationclose", (event) => {
  // Track dismissed notifications if needed
  const data = event.notification.data;
  if (data?.id) {
    // Could send analytics or mark as dismissed
    console.log("Notification dismissed:", data.id);
  }
});

// ==================== BACKGROUND SYNC ====================
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const response = await fetch("/api/notifications/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      throw new Error("Failed to sync notifications");
    }
    
    const { notifications } = await response.json();
    
    // Show each notification
    for (const notification of notifications || []) {
      await self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: notification.tag || `cashcore-${Date.now()}`,
        data: {
          url: notification.url || "/dashboard",
          type: notification.type,
          id: notification.id,
        },
      });
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// ==================== PERIODIC BACKGROUND SYNC ====================
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-notifications") {
    event.waitUntil(syncNotifications());
  }
});

// ==================== MESSAGE HANDLER ====================
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data?.type === "REQUEST_SYNC") {
    // Manually trigger background sync
    self.registration.sync.register("sync-notifications").catch(() => {
      // Fallback if sync not supported
      syncNotifications();
    });
  }
});
