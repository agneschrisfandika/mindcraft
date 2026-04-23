const CACHE_NAME = "pwa-template-v2";
const BASE_URL = self.registration.scope;

const urlsToCache = [
  `${BASE_URL}`,
  `${BASE_URL}index.html`,
  `${BASE_URL}offline.html`,
  `${BASE_URL}assets/style.css`,
  `${BASE_URL}manifest.json`,
  `${BASE_URL}icons/icon-192x192.png`,
  `${BASE_URL}icons/icon-512x512.png`,
];

// Install Service Worker & simpan file ke cache
self.addEventListener("install", event => {
  self.skipWaiting(); // langsung aktif tanpa reload manual
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error("Cache gagal dimuat:", err))
  );
});

// Aktivasi dan hapus cache lama
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Menghapus cache lama:", key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim(); // langsung klaim kontrol ke halaman
    })()
  );
});

// Fetch event: cache-first untuk file lokal, network-first untuk API
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan permintaan Chrome Extension, analytics, dll.
  if (url.protocol.startsWith("chrome-extension")) return;
  if (request.method !== "GET") return;

  // File lokal (statis)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(response => {
        return (
          response ||
          fetch(request).catch(() => caches.match(`${BASE_URL}offline.html`))
        );
      })
    );
  } 
  // Resource eksternal (API, CDN, dsb.)
  else {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Push notification dari backend
self.addEventListener("push", event => {
  let data = {
    title: "Notifikasi Baru",
    body: "Ada pembaruan dari aplikasi Anda.",
    icon: `${BASE_URL}icons/icon-192x192.png`,
    badge: `${BASE_URL}icons/icon-192x192.png`,
    url: `${BASE_URL}`,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: {
      url: data.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Klik notifikasi: buka/fokus ke halaman aplikasi
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || `${BASE_URL}`;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync
self.addEventListener("sync", event => {
  if (event.tag === "database-sync") {
    event.waitUntil(syncDatabase());
  }
});

async function syncDatabase() {
  try {
    // Contoh: kirim data lokal ke server
    // Ganti bagian ini dengan IndexedDB / data antrian milikmu
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Sync dari service worker"
      })
    });

    if (!response.ok) {
      throw new Error("Sync gagal");
    }

    console.log("Background sync berhasil");
  } catch (error) {
    console.error("Background sync error:", error);
    throw error;
  }
}