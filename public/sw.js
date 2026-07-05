// ==========================================
// Service Worker — Service Hub PWA
// Installable app shell + notification handling + (ready for Web Push)
// ==========================================
const CACHE = 'service-hub-v1';
const APP_SHELL = ['/', '/index.html', '/favicon.png', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    );
    self.clients.claim();
});

// Network-first للتنقّل، وتجاهل طلبات الـ API (Supabase) عشان الداتا تفضل لايف
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // متعملش كاش لـ Supabase/Telegram

    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
            return res;
        }).catch(() => cached))
    );
});

// ضغط الإشعار → افتح/ركّز التطبيق وابعتله التبويب المطلوب
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const tab = event.notification.data?.tab;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
            const client = clientsArr.find(c => 'focus' in c);
            if (client) {
                client.focus();
                if (tab) client.postMessage({ type: 'NOTIFICATION_CLICK', tab });
                return;
            }
            return self.clients.openWindow(tab ? `/?tab=${tab}` : '/');
        })
    );
});

// جاهز لاستقبال Web Push من السيرفر (Phase 2 — يحتاج VAPID + Edge Function)
self.addEventListener('push', (event) => {
    let payload = { title: 'Service Hub', body: 'عندك تحديث جديد', tab: 'today' };
    try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: '/favicon.png',
            badge: '/favicon.png',
            dir: 'rtl',
            lang: 'ar',
            data: { tab: payload.tab },
        })
    );
});
